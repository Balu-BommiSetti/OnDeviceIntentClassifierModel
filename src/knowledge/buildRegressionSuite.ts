import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/regression_suite.jsonl");

const PLACEHOLDER = /\{([A-Z_]+)\}/g;

// Fixed, deterministic filler per entity type — NOT random. Regression cases
// must be maximally simple and stable so a failure always means "the model
// got worse," never "the RNG happened to pick a harder value this run."
const FIXED_FILLERS: Record<string, string> = {
  AMOUNT: "500",
  TARGETAMOUNT: "50000",
  EXTRAPAYMENT: "1000",
  CATEGORY: "food",
  MERCHANT: "Amazon",
  DATE: "yesterday",
  PERIOD: "this month",
  TARGETDATE: "next year",
  PAYMENT_METHOD: "UPI",
  FREQUENCY: "monthly",
  INTERESTRATE: "8%",
  ASSETTYPE: "gold",
  LIABILITYTYPE: "home loan",
  LENDER: "the bank",
  GOALNAME: "a car",
  TENUREMONTHS: "12 months",
  SPLITWITH: "my roommate",
};

/**
 * Builds ONE canonical, unfilled-with-random-noise utterance per
 * (intent, action) pair — the fixed regression suite regression_suite.py
 * checks on every training run. Deterministic: same specs -> same output,
 * no seeded-RNG dependency at all (unlike generateFromSpec.ts's training
 * corpus, this set intentionally has zero variation).
 */
function buildSuite(): { utterance: string; intent: string; taskType: string }[] {
  const specs = loadIntentSpecs();
  const rows: { utterance: string; intent: string; taskType: string }[] = [];

  for (const spec of specs) {
    for (const action of spec.supported_actions) {
      const patterns = spec.utterance_patterns[action];
      if (!patterns || patterns.length === 0) continue;
      const pattern = patterns[0]; // first pattern, deterministic
      const utterance = pattern
        .replace(PLACEHOLDER, (_m, slot) => FIXED_FILLERS[slot] ?? _m)
        .replace(/\s+/g, " ")
        .trim();
      rows.push({ utterance, intent: spec.intent, taskType: action });
    }
  }
  return rows;
}

const rows = buildSuite();
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log(`✅ Built regression suite: ${rows.length} cases -> ${OUTPUT}`);
