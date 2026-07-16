import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs, IntentSpec } from "./index";
import { AMOUNTS, CATEGORIES, DATE_RANGES, FREQUENCIES, INTEREST_RATES, REGIONS, STYLE_MODIFIERS } from "../config/generationConfig";
import { seededShuffle, mulberry32 } from "./rng";
import { applyRegionalSlang } from "../utils/regionalization";
import { injectTypo, generateGrammarMistake } from "../utils/typoGenerator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Spec-driven dataset generator.
 *
 * Unlike the legacy generator, this:
 *   - reads ONLY the Knowledge Spec (single source of truth),
 *   - emits utterances that are specific to each Action (no shared skeletons),
 *   - can only produce VALID (intent, action) combinations by construction,
 *   - is deterministic (seeded), so the same seed -> byte-identical output,
 *   - targets semantic diversity per action, not permutation count.
 */

const SEED = 1337;
const OUTPUT = path.resolve(__dirname, "../../exported_dataset/spec_dataset.jsonl");

// Entity slot -> candidate fillers. Entities carry their own type for the NER head.
const SLOT_VALUES: Record<string, string[]> = {
  AMOUNT: AMOUNTS,
  CATEGORY: CATEGORIES,
  MERCHANT: ["Amazon", "Netflix", "Uber", "Swiggy", "Starbucks", "the landlord", "Walmart", "the clinic"],
  DATE: [...DATE_RANGES.RELATIVE, ...DATE_RANGES.MONTHLY, ...DATE_RANGES.WEEKLY],
  PERIOD: [...DATE_RANGES.MONTHLY, ...DATE_RANGES.YEARLY, ...DATE_RANGES.WEEKLY],
  PAYMENT_METHOD: ["credit card", "UPI", "cash", "debit card", "bank transfer"],
  FREQUENCY: FREQUENCIES,
  INTERESTRATE: INTEREST_RATES,
  ASSETTYPE: ["gold", "mutual fund", "stocks", "property", "land", "bitcoin", "fixed deposit", "SIP", "a house", "a car"],
  LIABILITYTYPE: ["home loan", "car loan", "personal loan", "credit card debt", "bike loan", "education loan", "EMI"],
  LENDER: ["the bank", "HDFC", "SBI", "my friend", "the credit union", "ICICI", "a relative"],
  GOALNAME: ["a car", "a house", "vacation", "emergency fund", "retirement", "an iphone", "wedding", "a laptop"],
  TARGETAMOUNT: AMOUNTS,
  TARGETDATE: [...DATE_RANGES.YEARLY, "next year", "in 3 years", "by December", "in 6 months", "by 2027"],
  EXTRAPAYMENT: AMOUNTS,
  TENUREMONTHS: ["12 months", "24 months", "36 months", "5 years", "10 years", "60 months"],
};

const PLACEHOLDER = /\{([A-Z_]+)\}/g;

interface Row {
  utterance: string;
  intent: string;
  taskType: string;
  backendAction: string;
  entities: { type: string; value: string }[];
}

function fill(pattern: string, rng: () => number): { utterance: string; entities: { type: string; value: string }[] } | null {
  const entities: { type: string; value: string }[] = [];
  let ok = true;
  const utterance = pattern.replace(PLACEHOLDER, (_m, slot) => {
    const pool = SLOT_VALUES[slot];
    if (!pool || pool.length === 0) { ok = false; return _m; }
    const value = pool[Math.floor(rng() * pool.length)];
    entities.push({ type: slot, value });
    return value;
  });
  if (!ok) return null;
  return { utterance: utterance.replace(/\s+/g, " ").trim(), entities };
}

function generateForSpec(spec: IntentSpec, rng: () => number): Row[] {
  const rows: Row[] = [];
  const target = spec.validation.min_distinct_utterances_per_action;

  // Fail loud on spec authoring mistakes rather than silently dropping data:
  //  - a supported action with no patterns would generate nothing;
  //  - patterns for an action NOT in supported_actions would be silently ignored.
  for (const action of spec.supported_actions) {
    if (!spec.utterance_patterns[action]?.length) {
      throw new Error(`[${spec.intent}] supported action "${action}" has no utterance_patterns.`);
    }
  }
  for (const action of Object.keys(spec.utterance_patterns)) {
    if (!spec.supported_actions.includes(action)) {
      throw new Error(`[${spec.intent}] utterance_patterns defines "${action}" which is not in supported_actions (would be silently dropped).`);
    }
  }

  for (const action of spec.supported_actions) {
    const patterns = spec.utterance_patterns[action] || [];
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = target * 40; // generous ceiling; dedup drives the real count

    while (seen.size < target && attempts < maxAttempts) {
      attempts++;
      const pattern = patterns[Math.floor(rng() * patterns.length)];
      const filled = fill(pattern, rng);
      if (!filled) continue;
      
      let finalUtterance = filled.utterance;

      // Apply Region Slang
      const region = REGIONS[Math.floor(rng() * REGIONS.length)];
      finalUtterance = applyRegionalSlang(finalUtterance, region);

      // Apply Conversational/Informal Styles
      const styleKeys = Object.keys(STYLE_MODIFIERS);
      const styleKey = styleKeys[Math.floor(rng() * styleKeys.length)];
      const styleObj = STYLE_MODIFIERS[styleKey];
      if (styleObj && styleKey !== "DIRECT") {
        const opener = styleObj.openers[Math.floor(rng() * styleObj.openers.length)];
        const filler = styleObj.fillers[Math.floor(rng() * styleObj.fillers.length)];
        if (opener) finalUtterance = `${opener} ${finalUtterance}`;
        if (filler && rng() < 0.5) finalUtterance = `${finalUtterance} ${filler}`;
      }

      // Apply Typos & Grammar Mistakes (15% chance)
      if (rng() < 0.15) {
        const words = finalUtterance.split(' ');
        if (words.length > 2) {
          const wIdx = Math.floor(rng() * words.length);
          words[wIdx] = injectTypo(words[wIdx]);
          finalUtterance = words.join(' ');
        }
      }
      if (rng() < 0.1) {
        finalUtterance = generateGrammarMistake(finalUtterance);
      }

      const key = finalUtterance.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        utterance: finalUtterance,
        intent: spec.intent,
        taskType: action,
        backendAction: `${spec.intent}_${action}`,
        entities: filled.entities,
      });
    }
  }
  return rows;
}

export function generate(): { rows: Row[]; outPath: string } {
  const specs = loadIntentSpecs();
  const rng = mulberry32(SEED);
  let rows: Row[] = [];
  for (const spec of specs) rows = rows.concat(generateForSpec(spec, rng));
  // Deterministic global shuffle so classes are interleaved.
  rows = seededShuffle(rows, SEED);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { rows, outPath: OUTPUT };
}

const { rows, outPath } = generate();
console.log(`✅ Generated ${rows.length} rows -> ${outPath}`);
