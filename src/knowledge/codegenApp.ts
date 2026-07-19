import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs, allIntents } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * App-targeted codegen. Emits artifacts INTO the WealthPilot native app so the
 * Knowledge Spec becomes the single source of truth for the app's label space
 * and advisory routing.
 *
 * SAFETY:
 *  - The on-device model's `tasks`/`slots`/`slot2idx`/`max_seq_length` are tied
 *    to trained weights and MUST NOT change here — we read the existing
 *    labels.json and preserve them verbatim.
 *  - Intent ORDER matters (intent2idx indexes the model's output head). We
 *    preserve the existing order for intents already present and APPEND any new
 *    spec intents (e.g. SIP_VS_PREPAY) at the end, so existing indices are
 *    stable. Newly appended intents require a retrain before the model can emit
 *    them — the file documents that.
 *  - We write *.generated.* files; a human diffs and promotes them. We never
 *    silently overwrite the live labels.json.
 */

const APP = process.env.WP_APP_DIR;
if (!APP || !fs.existsSync(APP)) {
  console.error(
    "❌ Set WP_APP_DIR to the wealthpilot_native_app directory before running app codegen.\n" +
    "   e.g.  WP_APP_DIR=/path/to/wealthpilot_native_app npm run dataset:codegen:app\n" +
    "   (This step writes labels.generated.json + intentRouteMap.generated.ts INTO that app repo.)"
  );
  process.exit(1);
}

// assets/nlp/ is the path the app ACTUALLY loads at runtime — ModelLoader.ts,
// IntentClassifier.ts, and VocabularyTokenizer.ts all require() from here.
// src/ai/model/assets/ is a stale, unused duplicate (confirmed via grep: no
// require() of its model.json/vocabulary.json/labels.json anywhere in the app)
// with a mismatched vocabulary/model pair — do not target it again.
const LABELS_PATH = path.join(APP, "assets/nlp/labels.json");
const OUT_LABELS = path.join(APP, "assets/nlp/labels.generated.json");
const OUT_ROUTEMAP = path.join(APP, "utils/ai/nlp/intentRouteMap.generated.ts");

function buildLabels() {
  const specs = loadIntentSpecs();
  const specIntents = allIntents(specs);
  const existing = JSON.parse(fs.readFileSync(LABELS_PATH, "utf8"));
  const existingIntents: string[] = existing.intents;

  // Preserve existing order; append spec intents not yet present (keeps indices stable).
  const ordered = [...existingIntents];
  const added: string[] = [];
  for (const i of specIntents) {
    if (!ordered.includes(i)) { ordered.push(i); added.push(i); }
  }
  // Report spec/app divergence (intents in app but not spec) as a warning, not a change.
  const orphaned = existingIntents.filter((i) => i !== "UNKNOWN" && !specIntents.includes(i));

  const labels = {
    ...existing, // preserves tasks, slots, slot2idx, max_seq_length verbatim
    intents: ordered,
    intent2idx: Object.fromEntries(ordered.map((v, i) => [v, i])),
  };
  fs.writeFileSync(OUT_LABELS, JSON.stringify(labels, null, 2));
  return { added, orphaned, total: ordered.length };
}

function buildRouteMap() {
  const specs = loadIntentSpecs();
  const entries = specs
    .map((s) => `  ${s.intent}: "${s.advisory_intent}",`)
    .sort()
    .join("\n");
  const header = `// AUTO-GENERATED from OnDeviceIntentClassifierModel knowledge specs. DO NOT EDIT BY HAND.
// Source of truth: src/knowledge/specs/*.intent.json
// Regenerate: npx tsx src/knowledge/codegenApp.ts
import type { Layer1Intent } from "./CognitionTypes";
import type { FinanceIntent } from "../f5/classifiers/IntentClassifier";

export const INTENT_ROUTE_MAP: Partial<Record<Layer1Intent, FinanceIntent>> = {
${entries}
};
`;
  fs.writeFileSync(OUT_ROUTEMAP, header);
  return specs.length;
}

const l = buildLabels();
const r = buildRouteMap();
console.log(`✅ Wrote ${OUT_LABELS}`);
console.log(`   intents: ${l.total} total`);
if (l.added.length) console.log(`   ⚠️  APPENDED (need retrain to be predictable): ${l.added.join(", ")}`);
if (l.orphaned.length) console.log(`   ⚠️  In app model but NOT in specs: ${l.orphaned.join(", ")}`);
console.log(`✅ Wrote ${OUT_ROUTEMAP} (${r} route mappings)`);
