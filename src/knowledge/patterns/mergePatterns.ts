/**
 * Merges human-reviewed patterns from patterns.candidate.json back into the
 * intent specs (Phase 1).
 *
 * Only entries with status "approved" are merged — the review step is deleting
 * lines from the candidate file, not editing statuses. Merging is idempotent
 * (skeleton-deduped against what the spec already has) and re-validates every
 * pattern against the CURRENT spec before writing, so a candidate file
 * generated before a spec edit cannot introduce an illegal slot.
 *
 * Specs are written back with 2-space JSON, preserving key order.
 *
 * Usage:
 *   npm run patterns:merge -- --dry-run   # show what would change
 *   npm run patterns:merge
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs } from "../index";
import { skeletonKey, validateCandidate, CandidatePattern, ValidationContext } from "./expandPatterns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATES = path.resolve(__dirname, "patterns.candidate.json");
const SPEC_DIR = path.resolve(__dirname, "../specs");

function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(CANDIDATES)) {
    console.error(`No candidate file at ${CANDIDATES} — run \`npm run patterns:expand\` first.`);
    process.exit(1);
  }

  const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, "utf-8")) as { candidates: CandidatePattern[] };
  const approved = candidates.filter((c) => c.status === "approved");
  const specs = loadIntentSpecs();
  const specByIntent = new Map(specs.map((s) => [s.intent, s]));

  // Cross-intent index, rebuilt from live specs (not the candidate file).
  const crossIntentKeys = new Map<string, string>();
  for (const spec of specs) {
    for (const patterns of Object.values(spec.utterance_patterns ?? {})) {
      for (const p of patterns as string[]) crossIntentKeys.set(skeletonKey(p), spec.intent);
    }
  }

  const added = new Map<string, string[]>(); // intent -> patterns added
  let skipped = 0;

  for (const c of approved) {
    const spec = specByIntent.get(c.intent);
    if (!spec) { skipped++; continue; }

    const existing = spec.utterance_patterns[c.taskType] ?? [];
    const ctx: ValidationContext = {
      spec,
      action: c.taskType,
      existingKeys: new Set(existing.map(skeletonKey)),
      crossIntentKeys,
      evalSuiteKeys: new Set(), // leakage was checked at expansion time against the live suites
    };
    const verdict = validateCandidate(c.pattern, ctx);
    if (!verdict.ok) {
      console.warn(`  skip [${c.intent}|${c.taskType}] "${c.pattern}" — ${verdict.reason}`);
      skipped++;
      continue;
    }

    spec.utterance_patterns[c.taskType] = [...existing, c.pattern];
    crossIntentKeys.set(skeletonKey(c.pattern), c.intent);
    if (!added.has(c.intent)) added.set(c.intent, []);
    added.get(c.intent)!.push(`${c.taskType}: ${c.pattern}`);
  }

  console.log(`\n${approved.length} approved, ${skipped} skipped on re-validation.`);
  for (const [intent, list] of added) console.log(`  ${intent}: +${list.length} pattern(s)`);

  if (dryRun) {
    console.log("\nDry run — no spec files written.");
    return;
  }

  for (const intent of added.keys()) {
    const spec = specByIntent.get(intent)!;
    const file = path.join(SPEC_DIR, `${intent}.intent.json`);
    fs.writeFileSync(file, JSON.stringify(spec, null, 2) + "\n");
  }
  console.log(`\n✅ Wrote ${added.size} spec file(s). Next: npm run dataset:build && npm run dataset:validate`);
}

main();
