// ═══════════════════════════════════════════════════════════════════════════════
//  WealthPilot — Dataset Patch Script  v2.0.0
//  Upgrades your existing personal_finance_dataset.json by:
//
//  1. Adding `subIntent` + `routing_signals` to every existing sample
//  2. Normalising `category` values using the expanded CATEGORY_MAP
//  3. Renaming old intent names to new taxonomy (if any differ)
//  4. Validating that all 16 new intents are present
//  5. Reporting gaps + coverage per intent × sub-intent
//
//  Run:  npx ts-node patch_dataset_v2.ts
//        (produces personal_finance_dataset_v2_patched.json)
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs";
import { SubIntentRouter } from "./sub_intent_router";
import { INTENT_TAXONOMY, TAXONOMY_METADATA } from "./intent_taxonomy";

type Intent = string;

// ─── CATEGORY NORMALISATION MAP ───────────────────────────────────────────────
//  Extends the original patch_dataset.ts CATEGORY_MAP with canonical labels.

const CATEGORY_CANONICAL: Record<string, string> = {
  // Groceries
  "groceries": "Groceries", "grocereis": "Groceries", "d-mart": "Groceries",
  "supermarket": "Groceries", "kirana": "Groceries",

  // Food
  "food": "Food", "kharcha": "Food",

  // Tea & Coffee
  "coffee": "Tea & Coffee", "coffe": "Tea & Coffee", "tea": "Tea & Coffee",
  "chai": "Tea & Coffee",

  // Transport
  "transportation": "Transport", "transit": "Transport",
  "auto rickshaw": "Transport", "cab": "Transport",

  // Entertainment
  "entertainment": "Entertainment", "concert tickets": "Entertainment",
  "movie theater": "Entertainment", "movies": "Entertainment",

  // Subscriptions
  "subscriptions": "Subscriptions", "netflix": "Subscriptions",
  "spotify": "Subscriptions", "prime": "Subscriptions",
  "subscription": "Subscriptions",

  // Utilities
  "utilities": "Utilities", "utlities": "Utilities", "bijli bill": "Utilities",
  "paani block": "Utilities", "electricity": "Utilities",

  // Fuel / Petrol
  "gas": "Fuel", "petrol": "Fuel", "diesel": "Fuel", "fuel": "Fuel",

  // Rent
  "rent": "Rent", "house rent": "Rent",

  // Travel
  "travel": "Travel", "flight": "Travel", "airbnb": "Travel",
  "hotel": "Travel", "car rent": "Travel",

  // Dining Out
  "dining out": "Dining Out", "restaurant": "Dining Out",
  "restuarant": "Dining Out", "eating out": "Dining Out",
  "dinner": "Dining Out", "lunch": "Dining Out",

  // Food Delivery
  "fast food": "Food Delivery", "swiggy": "Food Delivery",
  "zomato": "Food Delivery", "doordash": "Food Delivery",
  "uber eats": "Food Delivery", "blinkit": "Food Delivery",

  // Fitness
  "fitness": "Fitness", "gym": "Fitness", "workout": "Fitness",

  // Clothing
  "clothing": "Clothing", "clothes": "Clothing", "apparel": "Clothing",
  "shopping": "Clothing",

  // Education
  "education": "Education", "tuition": "Education",
  "school fees": "Education", "books": "Education",

  // Healthcare
  "health": "Healthcare", "dawa": "Healthcare", "medicine": "Healthcare",
  "healthcare": "Healthcare", "medical": "Healthcare",

  // Insurance
  "insurance": "Insurance", "premium": "Insurance",

  // Investment
  "investments": "Investment", "mutual funds": "Investment",
  "stocks": "Investment", "crypto": "Investment", "sip": "Investment",

  // Electronics
  "gadgets": "Electronics / Gadgets", "electronics": "Electronics / Gadgets",
  "laptop": "Electronics / Gadgets", "phone": "Electronics / Gadgets",

  // Other
  "parking": "Parking & Toll", "toll": "Parking & Toll",
  "dentistry": "Doctor / Consultation", "doctor": "Doctor / Consultation",
  "consultation": "Doctor / Consultation",
  "hardware": "Home Maintenance", "maintenance": "Home Maintenance",
  "repairs": "Home Maintenance",
  "pet care": "Pet Care", "vet": "Pet Care", "dog food": "Pet Care",
  "gifts": "Gifts & Donations", "charity": "Gifts & Donations",
  "donation": "Gifts & Donations",
  "hobbies": "Hobbies",
  "miscellaneous": "Other Expense",
};

// ─── INTENT RENAME MAP ────────────────────────────────────────────────────────
//  Maps old intent names in existing dataset → new taxonomy names.

const INTENT_RENAME: Record<string, Intent> = {
  // These are common mismatches from original datasets — add yours here
  "VIEW_SPENDING_ANALYSIS":  "SPENDING_ANALYSIS",
  "VIEW_CASHFLOW":           "CASHFLOW_WARNING",
  "VIEW_NET_WORTH":          "NET_WORTH_CHECK",
  "VIEW_DASHBOARD":          "SPENDING_ANALYSIS",   // reroute dashboard → analysis
  "ADD_COMMITMENT":          "ADD_LIABILITY",        // commitments → liabilities
  "CREATE_BUDGET":           "BUDGET_PLANNING",
  "ADD_GOAL":                "GOAL_PLANNING",
  "UPDATE_GOAL_PROGRESS":    "GOAL_PLANNING",
  "FINANCIAL_HEALTH_CHECK":  "SAVINGS_ADVICE",
};

// ─── VALID INTENTS IN NEW TAXONOMY ────────────────────────────────────────────

const VALID_INTENTS = new Set<string>(
  INTENT_TAXONOMY.map(i => i.id).concat(["UNKNOWN"])
);

// ─── PATCH LOGIC ─────────────────────────────────────────────────────────────

interface LegacySample {
  id?:            string;
  intent:         string;
  utterance?:     string;
  text?:          string;          // some datasets use "text" instead of "utterance"
  style?:         string;
  region?:        string;
  split?:         string;
  slots_filled?:  Record<string, string>;
  subIntent?:     string;
  routing_signals?: string[];
  [key: string]: unknown;
}

interface PatchedSample extends LegacySample {
  intent:          string;
  subIntent:       string | null;
  utterance:       string;
  routing_signals: string[];
  _patched:        boolean;
}

function normaliseCategory(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().trim();
  return CATEGORY_CANONICAL[lower] ?? raw;
}

function renameIntent(oldIntent: string): string {
  if (VALID_INTENTS.has(oldIntent)) return oldIntent;
  return INTENT_RENAME[oldIntent] ?? "UNKNOWN";
}

function patchSample(sample: LegacySample): PatchedSample {
  const utterance = (sample.utterance ?? sample.text ?? "").trim();
  const intent    = renameIntent(sample.intent);

  // Normalise category slot
  const slots = { ...(sample.slots_filled || {}) };
  if (slots.category) slots.category = normaliseCategory(slots.category)!;

  // Compute sub-intent
  const routing = SubIntentRouter.route(intent as Intent, utterance, { slots });

  return {
    ...sample,
    id:              sample.id ?? `patched_${Math.random().toString(36).slice(2, 9)}`,
    intent,
    subIntent:       intent === "UNKNOWN" ? null : routing.subIntent,
    utterance,
    slots_filled:    slots,
    routing_signals: routing.signals,
    split:           sample.split ?? "train",
    _patched:        true,
  };
}

// ─── STATISTICS ───────────────────────────────────────────────────────────────

interface PatchStats {
  totalIn:             number;
  totalOut:            number;
  intentRenamed:       number;
  subIntentAdded:      number;
  categoriesNormed:    number;
  unknownAfterPatch:   number;
  coverageByIntent:    Record<string, Record<string, number>>;
  missingSubIntents:   Array<{ intent: string; subIntent: string }>;
}

function buildStats(samples: PatchedSample[]): PatchStats {
  let intentRenamed = 0, subIntentAdded = 0, categoriesNormed = 0, unknownAfterPatch = 0;
  const coverageByIntent: Record<string, Record<string, number>> = {};
  const seenSubIntents = new Set<string>();

  for (const s of samples) {
    if (!coverageByIntent[s.intent]) coverageByIntent[s.intent] = {};
    const si = s.subIntent ?? "null";
    coverageByIntent[s.intent][si] = (coverageByIntent[s.intent][si] || 0) + 1;

    if (s.subIntent) { seenSubIntents.add(`${s.intent}::${s.subIntent}`); subIntentAdded++; }
    if (s.intent === "UNKNOWN") unknownAfterPatch++;
  }

  // Find missing sub-intents
  const missingSubIntents: Array<{ intent: string; subIntent: string }> = [];
  for (const intentDef of INTENT_TAXONOMY) {
    for (const sub of intentDef.subIntents) {
      const key = `${intentDef.id}::${sub.code}`;
      if (!seenSubIntents.has(key)) {
        missingSubIntents.push({ intent: intentDef.id, subIntent: sub.code });
      }
    }
  }

  return {
    totalIn: samples.length, totalOut: samples.length,
    intentRenamed, subIntentAdded, categoriesNormed,
    unknownAfterPatch, coverageByIntent, missingSubIntents,
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  WealthPilot Dataset Patch Script v2.0.0`);
  console.log(`${"═".repeat(70)}\n`);

  // ── Load existing dataset ─────────────────────────────────────────────────
  const inputPath = "./personal_finance_dataset.json";
  if (!fs.existsSync(inputPath)) {
    console.error(`  ✗ File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const existingSamples: LegacySample[] = raw.samples ?? raw ?? [];
  console.log(`  Loaded ${existingSamples.length.toLocaleString()} existing samples`);

  // ── Patch all samples ─────────────────────────────────────────────────────
  const patched = existingSamples.map(patchSample);
  console.log(`  Patched ${patched.length.toLocaleString()} samples\n`);

  // ── Statistics ────────────────────────────────────────────────────────────
  const stats = buildStats(patched);

  console.log(`  Coverage by intent × sub-intent:`);
  for (const [intent, subCounts] of Object.entries(stats.coverageByIntent).sort()) {
    const total = Object.values(subCounts).reduce((a, b) => a + b, 0);
    console.log(`\n  ${intent} (${total.toLocaleString()} total)`);
    for (const [sub, count] of Object.entries(subCounts).sort()) {
      const bar = "█".repeat(Math.min(30, Math.round(count / 10)));
      console.log(`    ${sub.padEnd(20)} ${String(count).padStart(5)}  ${bar}`);
    }
  }

  if (stats.missingSubIntents.length > 0) {
    console.log(`\n  ⚠  Missing sub-intents (need more training data):`);
    for (const m of stats.missingSubIntents) {
      console.log(`     ${m.intent}::${m.subIntent}`);
    }
  } else {
    console.log(`\n  ✓  All sub-intents have coverage!`);
  }

  // ── Write output ──────────────────────────────────────────────────────────
  const output = {
    metadata: {
      ...TAXONOMY_METADATA,
      patchedAt:       new Date().toISOString(),
      totalSamples:    patched.length,
      subIntentAware:  true,
      missingCoverage: stats.missingSubIntents,
    },
    samples: patched,
  };

  const outputPath = "./personal_finance_dataset_v2_patched.json";
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\n  ✅  Written: ${outputPath}`);
  console.log(`      Total samples: ${patched.length.toLocaleString()}`);
  console.log(`      Missing sub-intent coverage: ${stats.missingSubIntents.length} gaps\n`);
}

main();
