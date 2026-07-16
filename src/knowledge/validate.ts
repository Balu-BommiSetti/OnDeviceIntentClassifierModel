import fs from "fs";
import readline from "readline";
import { loadIntentSpecs, allIntents, validCombos, IntentSpec } from "./index";

/**
 * Dataset quality gate. Exits non-zero (fails the build) if ANY of these hold:
 *   1. Intent coverage incomplete (a spec intent produced no rows).
 *   2. Generated intents differ from the taxonomy (unknown intent in data).
 *   3. Duplicate utterances with conflicting labels (same text -> 2+ labels).
 *   4. Invalid (intent, action) combinations (not declared in the spec).
 *   5. Per-action diversity below the spec's threshold.
 */
export async function validate(datasetPath: string): Promise<{ ok: boolean; errors: string[] }> {
  const specs = loadIntentSpecs();
  const intentSet = new Set(allIntents(specs));
  const combos = validCombos(specs);
  const errors: string[] = [];

  const perComboDistinct = new Map<string, Set<string>>(); // intent|action -> distinct utterances
  const labelByUtterance = new Map<string, Set<string>>(); // utterance -> distinct intent|action
  const intentsSeen = new Set<string>();

  const rl = readline.createInterface({ input: fs.createReadStream(datasetPath), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    n++;
    const r = JSON.parse(line);
    const combo = `${r.intent}|${r.taskType}`;
    intentsSeen.add(r.intent);

    // (2) unknown intent
    if (!intentSet.has(r.intent)) errors.push(`Unknown intent in data: ${r.intent}`);
    // (4) invalid combo
    if (!combos.has(combo)) errors.push(`Invalid combination: ${combo}`);

    if (!perComboDistinct.has(combo)) perComboDistinct.set(combo, new Set());
    perComboDistinct.get(combo)!.add(r.utterance.toLowerCase());

    const u = r.utterance.toLowerCase();
    if (!labelByUtterance.has(u)) labelByUtterance.set(u, new Set());
    labelByUtterance.get(u)!.add(combo);
  }

  // (1) coverage
  for (const intent of intentSet) {
    if (!intentsSeen.has(intent)) errors.push(`No samples generated for intent: ${intent}`);
  }
  // (3) conflicting labels
  let conflicts = 0;
  for (const [u, labels] of labelByUtterance) {
    if (labels.size > 1) { conflicts++; if (conflicts <= 5) errors.push(`Conflicting labels for "${u}": ${[...labels].join(", ")}`); }
  }
  if (conflicts > 5) errors.push(`...and ${conflicts - 5} more conflicting utterances (${conflicts} total)`);

  // (5) diversity
  const bySpec = new Map<string, IntentSpec>(specs.map((s) => [s.intent, s]));
  for (const [combo, set] of perComboDistinct) {
    const [intent, action] = combo.split("|");
    const min = bySpec.get(intent)?.validation.min_distinct_utterances_per_action ?? 0;
    if (set.size < min) errors.push(`Low diversity ${combo}: ${set.size} distinct < required ${min}`);
  }

  // Dedupe error list, keep order
  const unique = [...new Set(errors)];
  const ok = unique.length === 0;
  console.log(`Validated ${n} rows across ${intentsSeen.size} intents.`);
  if (ok) console.log("✅ PASS — all quality gates satisfied.");
  else { console.error(`❌ FAIL — ${unique.length} issue(s):`); unique.forEach((e) => console.error("  - " + e)); }
  return { ok, errors: unique };
}

const datasetArg = process.argv[2] || "./exported_dataset/spec_dataset.jsonl";
validate(datasetArg).then(({ ok }) => process.exit(ok ? 0 : 1));
