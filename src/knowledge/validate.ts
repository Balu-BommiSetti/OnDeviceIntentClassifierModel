import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { loadIntentSpecs, allIntents, validCombos, IntentSpec } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dataset quality gate. Exits non-zero (fails the build) if ANY of these hold:
 *   1. Intent coverage incomplete (a spec intent produced no rows).
 *   2. Generated intents differ from the taxonomy (unknown intent in data).
 *   3. Duplicate utterances with conflicting labels (same text -> 2+ labels).
 *   4. Invalid (intent, action) combinations (not declared in the spec).
 *   5. Per-action diversity below the spec's threshold.
 *   6. Entity surface-form diversity below MIN_ENTITY_SURFACE_FORMS — a
 *      regression guard so a future entity type can't ship with only a
 *      handful of interchangeable values (see docs/ai_chat's on-device NLP
 *      review: AMOUNT dropped to 16 surface forms across 44,838 uses in an
 *      earlier pipeline generation — this gate makes that class of defect a
 *      build failure instead of a silent data-quality regression).
 *   7. Bucket-balance ratio (max/min records per (intent, action)) above
 *      MAX_BUCKET_IMBALANCE_RATIO — a regression guard against the same
 *      review's 357x bucket-imbalance finding recurring.
 *   8. Pattern-SKELETON diversity below MIN_DISTINCT_PATTERNS_PER_BUCKET —
 *      distinct sourcePattern per bucket. Utterance diversity (gate 5) is
 *      satisfiable by entity fills alone; skeletons are what the
 *      template-aware split holds out, so skeletons are what generalization
 *      is trained on. (Phase 0, 2026-07-18.)
 *   9. Eval-suite leakage — any training utterance appearing in
 *      qa_scenarios.jsonl / hard_cases.jsonl (the held-out Tier-2 suites).
 */
const MIN_ENTITY_SURFACE_FORMS = 5;
/**
 * Gate (8) — PATTERN diversity (Phase 0 of the 2026-07-18 production plan).
 * Distinct sourcePattern SKELETONS per (intent, action), not distinct
 * utterances: entity fills alone satisfied the old utterance gate while the
 * corpus had only ~5.3 skeletons per bucket, which — under train.py's
 * template_aware_split (whole skeletons held out) — is exactly why the
 * 2026-07-17 model scored 21.5% intent accuracy. This gate makes skeleton
 * starvation a BUILD FAILURE. It is EXPECTED to fail until Phase 1's
 * pattern-expansion engine delivers; do not lower it to get a build through.
 */
const MIN_DISTINCT_PATTERNS_PER_BUCKET = 25;
/**
 * Gate (9) — evaluation-suite leakage. Training utterances must never appear
 * in the held-out real-world suites (qa_scenarios.jsonl, hard_cases.jsonl) —
 * a leaked case silently converts a Tier-2 real-world measurement into an
 * in-distribution one. regression_suite.jsonl is deliberately NOT checked:
 * it is generated FROM the spec patterns with fixed fillers, so overlap with
 * training data is by-design (it measures "did the basics get worse").
 */
const EVAL_SUITE_PATHS = [
  path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/qa_scenarios.jsonl"),
  path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/hard_cases.jsonl"),
];
// 2.5x tolerates the expected variance from short_reply_patterns rows
// stacking onto a CREATE bucket that already met its own diversity floor
// (see ADD_EXPENSE|CREATE), while still catching genuine regressions toward
// the 357x imbalance the prior review found in an earlier pipeline generation.
const MAX_BUCKET_IMBALANCE_RATIO = 4.0;

export interface DatasetQualityReport {
  totalRows: number;
  vocabularySize: number;
  intentCount: number;
  taskCount: number;
  perEntitySurfaceForms: Record<string, number>;
  perBucketCounts: Record<string, number>;
  /** Gate (8): distinct sourcePattern skeletons per intent|action bucket. */
  perBucketPatternCounts: Record<string, number>;
  bucketImbalanceRatio: number;
  negativeExampleCount: number; // UNKNOWN intent rows
  shortReplyCount: number;
  shortReplyPercent: number;
  /** Gate (9): training utterances found in the held-out eval suites. */
  evalSuiteLeakageCount: number;
}

export async function validate(datasetPath: string): Promise<{ ok: boolean; errors: string[]; report: DatasetQualityReport }> {
  const specs = loadIntentSpecs();
  const intentSet = new Set(allIntents(specs));
  const combos = validCombos(specs);
  const errors: string[] = [];

  const perComboDistinct = new Map<string, Set<string>>(); // intent|action -> distinct utterances
  const perComboPatterns = new Map<string, Set<string>>(); // intent|action -> distinct sourcePattern skeletons
  const labelByUtterance = new Map<string, Set<string>>(); // utterance -> distinct intent|action

  // Gate (9): load the held-out eval-suite utterances up front.
  const evalSuiteUtterances = new Set<string>();
  for (const suitePath of EVAL_SUITE_PATHS) {
    if (!fs.existsSync(suitePath)) continue;
    for (const line of fs.readFileSync(suitePath, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row.utterance) evalSuiteUtterances.add(String(row.utterance).toLowerCase());
      } catch { /* tolerate a malformed suite line; the suite has its own builder */ }
    }
  }
  let evalSuiteLeakageCount = 0;
  const intentsSeen = new Set<string>();
  const entitySurfaceForms = new Map<string, Set<string>>(); // entity type -> distinct values seen
  const vocabulary = new Set<string>();
  let negativeExampleCount = 0;
  let shortReplyCount = 0;

  // A row is a "short reply" if it's short enough to plausibly be a bare
  // clarification answer rather than a full sentence — mirrors the intent
  // behind short_reply_patterns without requiring the report to re-derive
  // which spec/entity produced each row.
  const SHORT_REPLY_TOKEN_CEILING = 4;

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

    // (8) skeleton tracking — rows without sourcePattern (hand-authored) are
    // counted as their own skeleton so they still contribute diversity.
    if (!perComboPatterns.has(combo)) perComboPatterns.set(combo, new Set());
    perComboPatterns.get(combo)!.add(r.sourcePattern ?? `__handauthored__:${u}`);

    // (9) leakage against held-out eval suites
    if (evalSuiteUtterances.has(u)) {
      evalSuiteLeakageCount++;
      if (evalSuiteLeakageCount <= 5) errors.push(`Eval-suite leakage: training row "${u}" appears in a held-out suite`);
    }

    for (const entity of r.entities ?? []) {
      if (!entitySurfaceForms.has(entity.type)) entitySurfaceForms.set(entity.type, new Set());
      entitySurfaceForms.get(entity.type)!.add(String(entity.value).toLowerCase());
    }

    for (const token of r.tokens ?? []) vocabulary.add(token);
    if (r.intent === "UNKNOWN") negativeExampleCount++;
    if ((r.tokens?.length ?? Infinity) <= SHORT_REPLY_TOKEN_CEILING) shortReplyCount++;
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

  // (5) FILL diversity — distinct utterances PER TEMPLATE, not a flat count.
  //
  // The flat min_distinct_utterances_per_action (80) is what let starved
  // buckets look healthy: entity fills alone satisfied it while the bucket had
  // 4 skeletons. Gate 8 now owns skeleton diversity, so gate 5's remaining job
  // is narrower — ensure each skeleton is filled with enough DIFFERENT entity
  // values that the NER head sees variety. Scaling it also stops it fighting
  // generateFromSpec's rows-per-template target.
  const MIN_FILLS_PER_TEMPLATE = 3;
  for (const [combo, set] of perComboDistinct) {
    const patterns = perComboPatterns.get(combo)?.size ?? 0;
    if (patterns === 0) continue;
    const required = patterns * MIN_FILLS_PER_TEMPLATE;
    if (set.size < required) {
      errors.push(`Low FILL diversity ${combo}: ${set.size} distinct utterance(s) across ${patterns} template(s) < required ${required} (${MIN_FILLS_PER_TEMPLATE}/template)`);
    }
  }

  // (8) pattern-skeleton diversity floor (UNKNOWN|NONE exempt — negatives
  // are free-form utterances, not entity-filled skeletons)
  for (const [combo, patterns] of perComboPatterns) {
    if (combo === "UNKNOWN|NONE") continue;
    if (patterns.size < MIN_DISTINCT_PATTERNS_PER_BUCKET) {
      errors.push(`Low PATTERN diversity ${combo}: ${patterns.size} distinct skeleton(s) < required ${MIN_DISTINCT_PATTERNS_PER_BUCKET} (see Phase 1 pattern expansion)`);
    }
  }
  if (evalSuiteLeakageCount > 5) errors.push(`...and ${evalSuiteLeakageCount - 5} more eval-suite leakage rows (${evalSuiteLeakageCount} total)`);

  // (6) entity surface-form diversity floor
  for (const [entityType, values] of entitySurfaceForms) {
    if (values.size < MIN_ENTITY_SURFACE_FORMS) {
      errors.push(`Low entity diversity ${entityType}: ${values.size} distinct value(s) < required ${MIN_ENTITY_SURFACE_FORMS}`);
    }
  }

  // (7) bucket-balance ratio
  const bucketSizes = [...perComboDistinct.values()].map((s) => s.size).filter((n) => n > 0);
  if (bucketSizes.length > 0) {
    const maxSize = Math.max(...bucketSizes);
    const minSize = Math.min(...bucketSizes);
    const ratio = minSize > 0 ? maxSize / minSize : Infinity;
    if (ratio > MAX_BUCKET_IMBALANCE_RATIO) {
      const maxCombo = [...perComboDistinct.entries()].find(([, s]) => s.size === maxSize)?.[0];
      const minCombo = [...perComboDistinct.entries()].find(([, s]) => s.size === minSize)?.[0];
      errors.push(
        `Bucket imbalance: ${maxCombo} has ${maxSize} records vs ${minCombo}'s ${minSize} (${ratio.toFixed(1)}x > allowed ${MAX_BUCKET_IMBALANCE_RATIO}x)`
      );
    }
  }

  // Dedupe error list, keep order
  const unique = [...new Set(errors)];
  const ok = unique.length === 0;

  const bucketSizesFinal = [...perComboDistinct.values()].map((s) => s.size).filter((n) => n > 0);
  const report: DatasetQualityReport = {
    totalRows: n,
    vocabularySize: vocabulary.size,
    intentCount: intentsSeen.size,
    taskCount: new Set([...perComboDistinct.keys()].map((c) => c.split("|")[1])).size,
    perEntitySurfaceForms: Object.fromEntries([...entitySurfaceForms.entries()].map(([k, v]) => [k, v.size])),
    perBucketCounts: Object.fromEntries([...perComboDistinct.entries()].map(([k, v]) => [k, v.size])),
    perBucketPatternCounts: Object.fromEntries([...perComboPatterns.entries()].map(([k, v]) => [k, v.size])),
    evalSuiteLeakageCount,
    bucketImbalanceRatio: bucketSizesFinal.length > 0 ? Math.max(...bucketSizesFinal) / Math.min(...bucketSizesFinal) : 0,
    negativeExampleCount,
    shortReplyCount,
    shortReplyPercent: n > 0 ? +((shortReplyCount / n) * 100).toFixed(1) : 0,
  };

  console.log(`Validated ${n} rows across ${intentsSeen.size} intents.`);
  if (ok) console.log("✅ PASS — all quality gates satisfied.");
  else { console.error(`❌ FAIL — ${unique.length} issue(s):`); unique.forEach((e) => console.error("  - " + e)); }
  return { ok, errors: unique, report };
}

async function main() {
  const datasetArg = process.argv[2] || "./exported_dataset/spec_dataset.jsonl";
  const { ok, errors, report } = await validate(datasetArg);

  const reportPath = "./exported_dataset/dataset_quality_report.json";
  // validationPassed + errors are embedded so deployment_checklist.py gates
  // on the OUTCOME, not mere existence — a failing validate still writes a
  // report (for inspection), and the checklist must treat it as a failure.
  fs.writeFileSync(reportPath, JSON.stringify({ validationPassed: ok, errorCount: errors.length, ...report }, null, 2));
  console.log(`📊 Quality report written to ${reportPath}`);

  process.exit(ok ? 0 : 1);
}

main();
