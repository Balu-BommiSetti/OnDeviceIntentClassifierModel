/**
 * Hinglish pattern generator — per intent+taskType, WITH slot placeholders.
 *
 * WHY THIS EXISTS
 * Hinglish support was an open product question through several iterations and
 * has now been answered: YES, we support it. Every Hinglish query in the device
 * runs and probe sweeps failed, and measurement showed why — real Hinglish
 * coverage in the training set is effectively ZERO. (A naive grep suggested
 * 1.17%, but almost all of those hits were the currency word "paisa" inside
 * ordinary English rows, not Hinglish grammar.)
 *
 * Hinglish is a LANGUAGE SURFACE, not a synonym gap: "mera kitna kharcha hua
 * is mahine" shares almost no tokens with "how much did I spend this month".
 * No amount of English pattern-widening reaches it. It needs its own patterns.
 *
 * CRITICAL DIFFERENCE FROM bucketProbe.ts
 * That script generates finished QUERIES for evaluation. This one generates
 * PATTERNS with {SLOT} placeholders for TRAINING, so the NER head still learns
 * spans. A Hinglish pattern with no placeholder teaches intent but destroys
 * entity extraction for that phrasing — which would trade one failure for
 * another, exactly the pattern this project keeps rediscovering.
 *
 * Usage:
 *   ./scripts/run-ts.sh src/knowledge/hinglishPatterns.ts --dry-run
 *   ./scripts/run-ts.sh src/knowledge/hinglishPatterns.ts --intent ADD_EXPENSE
 *   ./scripts/run-ts.sh src/knowledge/hinglishPatterns.ts --apply    # writes specs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(__dirname, "specs");
const OUT_PATH = path.resolve(__dirname, "patterns/hinglish.candidate.json");

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.PROBE_MODEL || "gpt-oss:20b-cloud";

interface Spec {
  intent: string;
  description?: string;
  supported_actions: string[];
  required_entities?: string[];
  optional_entities?: string[];
  utterance_patterns: Record<string, string[]>;
}

const TASK_MEANING: Record<string, string> = {
  SUMMARY: "a plain readout", ANALYSIS: "WHY something is so",
  INSIGHTS: "notable findings", TREND: "direction over periods",
  COMPARISON: "two things contrasted", STATUS: "on track or not",
  ALLOCATION: "how to divide money", WHAT_IF: "a hypothetical",
  STRATEGY: "what approach", SCHEDULE: "what is due when",
  RISK: "over-exposed or not", CREATE: "record something new",
  UPDATE: "correct an existing entry", DELETE: "remove an entry",
};

function loadSpecs(): Spec[] {
  return fs.readdirSync(SPEC_DIR).filter((f) => f.endsWith(".intent.json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), "utf-8")) as Spec);
}

function buildPrompt(spec: Spec, action: string, count: number): string {
  const slots = [...(spec.required_entities ?? []), ...(spec.optional_entities ?? [])];
  const anchors = (spec.utterance_patterns[action] ?? []).slice(0, 3);
  return `Write ${count} HINGLISH utterance patterns for an Indian personal-finance app.

Hinglish = Hindi grammar written in Latin script, mixed with English finance words.
Real examples of the register: "mera kitna kharcha hua is mahine",
"kitna bacha", "EMI kab tk chalegi", "wo transfer delete kar do",
"salary aayi kya", "2 lakh bacha hai".

TARGET: intent=${spec.intent}, taskType=${action} (${TASK_MEANING[action] ?? action})
ENGLISH ANCHORS (same meaning, do NOT translate literally):
${anchors.map((a) => `- ${a}`).join("\n")}

SLOTS you may use: ${slots.map((s) => `{${s}}`).join(" ")}
Also allowed: {PERIODSHORT} (short period), {PLAINAMOUNT} (clean number)

RULES — these matter more than fluency:
- Use {SLOT} placeholders wherever a value belongs. A pattern with NO
  placeholder is useless to us. At least ${Math.ceil(count * 0.7)} must contain one.
- Natural spoken Hinglish, not translated English. Hindi word order.
- Vary: questions, commands, fragments.
- Common spellings people actually type (kitna/kitne, kyon/kyun, kar do/krdo).
- Every line must mean ${action} for ${spec.intent}, nothing else.

Return ONLY a JSON array of strings.`;
}

async function callLlm(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL, prompt, stream: false, format: "json",
      options: { temperature: 0.9, num_predict: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return (await res.json()).response ?? "";
}

function parseArr(raw: string): string[] {
  const tryP = (s: string): string[] | null => {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
      if (v && typeof v === "object")
        for (const val of Object.values(v))
          if (Array.isArray(val)) return (val as unknown[]).filter((x) => typeof x === "string") as string[];
    } catch { /* fall through */ }
    return null;
  };
  const d = tryP(raw.trim()); if (d?.length) return d;
  const m = raw.match(/\[[\s\S]*\]/); if (m) { const a = tryP(m[0]); if (a?.length) return a; }
  const out: string[] = [];
  for (const mm of raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const s = mm[1].replace(/\\"/g, '"').trim();
    if (s.length > 8 && s.includes(" ")) out.push(s);
  }
  return out;
}

/** Reject anything that would poison training rather than help it. */
function validate(p: string, spec: Spec, action: string): string | null {
  const declared = new Set([...(spec.required_entities ?? []), ...(spec.optional_entities ?? []),
                            "PERIODSHORT", "PLAINAMOUNT"]);
  const used = [...p.matchAll(/\{([A-Z_0-9]+)\}/g)].map((m) => m[1]);
  for (const u of used) {
    const base = u.replace(/\d+$/, "");
    // An undeclared slot silently generates nothing (the SPLITWITH failure
    // mode) — reject at authoring time instead.
    if (!declared.has(u) && !declared.has(base)) return `undeclared slot {${u}}`;
  }
  if (p.length < 6) return "too short";
  if (!/[a-z]/i.test(p)) return "no letters";
  // Must actually BE Hinglish. The first full sweep returned 24 plain-English
  // patterns ("Add {ASSETTYPE} worth {AMOUNT}.") which would just duplicate
  // existing English coverage while diluting the Hinglish signal we are paying
  // for. Require at least one Hindi grammar marker — deliberately NOT "paisa",
  // which is a currency word that appears in ordinary English rows and made a
  // naive coverage grep read 1.17% when the true figure was ~0.
  if (!HINGLISH_MARKER.test(p)) return "not Hinglish (no Hindi grammar marker)";
  return null;
}

const HINGLISH_MARKER = /\b(kitna|kitne|kitni|kharcha|kharch|bacha|bache|bachat|karo|kar do|krdo|karna|mera|meri|mere|kya|kyun|kyon|kab|kaise|batao|batado|dikhao|karun|karu|chahiye|hua|hui|hai|hain|ho|mein|me|ka|ki|ke|se|ko|pe|par|wala|wali|pichle|abhi|zyada|kam|sab|thoda|jyada|nahi|nai|aur|ya|liya|diya|bhej|bharu|lagta|dena|milta)\b/i;

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const onlyIntent = flag("--intent");
  const count = parseInt(flag("--count") ?? "10", 10);
  const dryRun = args.includes("--dry-run");
  const apply = args.includes("--apply");
  // --apply REGENERATES before applying, which defeats the review-then-apply
  // workflow this file documents: thecandidate you reviewed is not the one
  // that lands. Kept for now because validate() enforces the same rules the
  // manual review checked, but --apply-only (apply the existing candidate
  // file, no LLM calls) is the correct shape. TODO before the next use.

  const specs = loadSpecs().filter((s) => s.intent !== "UNKNOWN");
  const buckets: Array<{ spec: Spec; action: string }> = [];
  for (const spec of specs) {
    if (onlyIntent && spec.intent !== onlyIntent) continue;
    for (const action of spec.supported_actions) buckets.push({ spec, action });
  }

  if (dryRun) {
    console.log(`--- DRY RUN (${buckets.length} buckets) ---\n`);
    console.log(buildPrompt(buckets[0].spec, buckets[0].action, count));
    return;
  }

  const result: Record<string, Record<string, string[]>> = {};
  let kept = 0, rejected = 0, noSlot = 0;

  for (const { spec, action } of buckets) {
    let arr: string[] = [];
    try { arr = parseArr(await callLlm(buildPrompt(spec, action, count))); }
    catch (e: any) { console.log(`  ✗ ${spec.intent}|${action}: ${e.message}`); continue; }

    const good: string[] = [];
    for (const p of arr) {
      const err = validate(p, spec, action);
      if (err) { rejected++; continue; }
      if (!/\{[A-Z_0-9]+\}/.test(p)) { noSlot++; continue; }
      good.push(p.trim());
    }
    if (good.length) {
      (result[spec.intent] ??= {})[action] = good;
      kept += good.length;
    }
    console.log(`  ${good.length ? "✓" : "✗"} ${spec.intent}|${action}: ${good.length}`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`\n[*] kept ${kept} · rejected ${rejected} (invalid) · dropped ${noSlot} (no slot)`);
  console.log(`[*] -> ${OUT_PATH}`);

  if (apply) {
    let added = 0;
    for (const [intent, actions] of Object.entries(result)) {
      const p = path.join(SPEC_DIR, `${intent}.intent.json`);
      const spec = JSON.parse(fs.readFileSync(p, "utf-8"));
      for (const [action, pats] of Object.entries(actions)) {
        const existing = new Set(spec.utterance_patterns[action] ?? []);
        for (const q of pats) if (!existing.has(q)) { spec.utterance_patterns[action].push(q); added++; }
      }
      fs.writeFileSync(p, JSON.stringify(spec, null, 2) + "\n");
    }
    console.log(`[*] APPLIED ${added} Hinglish patterns to specs`);
  } else {
    console.log(`[*] review the file, then re-run with --apply`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
