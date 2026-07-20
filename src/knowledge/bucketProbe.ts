/**
 * Per-bucket probe generator — LABELLED eval queries, one intent+taskType at a time.
 *
 * WHY THIS EXISTS (the loop we are replacing)
 * Until now every quality gap was discovered AFTER a ~25-minute training run:
 * generate patterns -> train -> QA suite -> read failures -> add patterns ->
 * train again. Two structural problems made that loop slow AND unreliable:
 *
 *   1. THE FEEDBACK ARRIVES AT THE WRONG END. Every failure we actually hit
 *      (ALLOCATION verbs untrained, loan reads falling to UNKNOWN, "gas
 *      stations" vs Fuel) was a COVERAGE gap knowable in seconds. Training
 *      was never needed to discover it — only to confirm it.
 *   2. NO GROUND TRUTH. The device harness records what the model said, never
 *      what it should have said, so "accuracy" was always a human judgement
 *      call over a few hundred rows.
 *
 * This script fixes both at once. It asks the LLM for realistic user queries
 * for ONE bucket at a time — so every query is labelled BY CONSTRUCTION (we
 * know its intent+taskType because we asked for exactly that). The output is
 * simultaneously:
 *   - a coverage probe   ("do our patterns even cover how people say this?")
 *   - a real eval set    (expected intent+taskType attached to every row)
 *
 * Pair with probe_eval.py, which scores the CURRENT exported model against the
 * probe set. That yields a per-bucket accuracy heatmap in ~2 minutes with NO
 * retraining, so we only spend training time on buckets already known to be
 * weak — and we retrain once, not once per discovery.
 *
 * TOKEN BUDGET
 * Deliberately narrow: one bucket per call, carrying only that bucket's own
 * slice of the taxonomy (~300 tokens in, ~400 out). The whole 55-bucket sweep
 * is ~20k tokens total — cheaper than a single broad "generate everything"
 * prompt, and far more controllable, because a per-bucket ask cannot collapse
 * onto whichever intent the model finds easiest to imagine (which is exactly
 * how the first hand-written batch came back 36/40 SPENDING_ANALYSIS).
 *
 * Usage:
 *   ./scripts/run-ts.sh src/knowledge/bucketProbe.ts                    # all buckets
 *   ./scripts/run-ts.sh src/knowledge/bucketProbe.ts --intent BUDGET_PLANNING
 *   ./scripts/run-ts.sh src/knowledge/bucketProbe.ts --intent X --action ALLOCATION
 *   ... --provider openai      (needs OPENAI_API_KEY)
 *   ... --count 25             (queries per bucket, default 20)
 *   ... --dry-run              (print one prompt and exit — inspect before spending)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(__dirname, "specs");
const OUT_PATH = path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/probe_set.jsonl");
const HELD_OUT = [
  path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/qa_scenarios.jsonl"),
  path.resolve(__dirname, "../../v6/training_pipeline/benchmarks/hard_cases.jsonl"),
];

type Provider = "ollama" | "openai";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.PROBE_MODEL || process.env.PATTERN_MODEL || "gpt-oss:20b-cloud";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

interface Spec {
  intent: string;
  description?: string;
  supported_actions: string[];
  required_entities?: string[];
  optional_entities?: string[];
  utterance_patterns: Record<string, string[]>;
}

/** What each taskType means, in one line — the model needs this to aim. */
const TASK_MEANING: Record<string, string> = {
  SUMMARY: "a plain number or readout",
  ANALYSIS: "WHY something is the way it is",
  INSIGHTS: "notable or surprising observations",
  TREND: "direction across several periods",
  COMPARISON: "two things explicitly contrasted",
  STATUS: "am I on track / over the line",
  ALLOCATION: "how should money be divided or distributed",
  WHAT_IF: "a hypothetical scenario",
  STRATEGY: "what approach should I take",
  SCHEDULE: "what is due and when",
  RISK: "is this dangerous / am I over-exposed",
  CREATE: "recording a NEW entry",
  UPDATE: "correcting an entry already recorded",
  DELETE: "removing an entry already recorded",
  NONE: "not a supported request at all",
};

function loadSpecs(): Spec[] {
  return fs.readdirSync(SPEC_DIR)
    .filter((f) => f.endsWith(".intent.json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), "utf-8")) as Spec);
}

function loadHeldOut(): Set<string> {
  const s = new Set<string>();
  for (const p of HELD_OUT) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line);
        const u = o.utterance ?? o.text;
        if (u) s.add(String(u).toLowerCase().trim());
      } catch { /* skip malformed */ }
    }
  }
  return s;
}

/**
 * Compact per-bucket prompt.
 *
 * Three things earn their tokens here and should not be trimmed:
 *   - SIBLING taskTypes, listed as things to AVOID. Without them the model
 *     drifts into the neighbouring bucket and the "label by construction"
 *     guarantee silently breaks.
 *   - Anchor patterns marked explicitly as STYLE ONLY. Omit that warning and
 *     the model paraphrases them, which produces an in-distribution eval set
 *     that scores high and measures nothing.
 *   - The realism rules. Template-shaped queries are precisely what the model
 *     is already good at; the gap is everyday phrasing.
 */
function buildPrompt(spec: Spec, action: string, count: number): string {
  const siblings = spec.supported_actions.filter((a) => a !== action);
  const anchors = (spec.utterance_patterns[action] ?? []).slice(0, 4);
  const ents = [...(spec.required_entities ?? []), ...(spec.optional_entities ?? [])];

  return `Generate ${count} realistic queries a real user would type into an Indian personal-finance app.

TARGET: intent=${spec.intent}, taskType=${action}
MEANING: ${spec.description ?? spec.intent} — ${TASK_MEANING[action] ?? action}
${ents.length ? `DETAILS USERS MAY MENTION: ${ents.join(", ")}` : ""}
${siblings.length ? `MUST NOT be any of these sibling taskTypes: ${siblings.join(", ")}` : ""}

STYLE ANCHORS (shape only — DO NOT paraphrase or reuse these):
${anchors.map((a) => `- ${a}`).join("\n")}

RULES:
- Everyday texting language. Casual verbs, lowercase, missing punctuation are all good.
- Vary the sentence shape: questions, bare fragments, commands. Not all starting the same way.
- Use Indian money (500, 2k, 50k, 1.5L, 2 lakh, 12 crore) and Indian merchants where natural.
- Vary WHERE the time period sits — start of sentence sometimes, not always the end.
- Include 2 or 3 Hinglish queries.
- Every line must unambiguously be ${action}, not a sibling taskType.
- No two lines may be the same sentence with one word swapped.

Return ONLY a JSON array of strings. No commentary.`;
}

async function callOllama(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL, prompt, stream: false, format: "json",
      // 8192: 2048 truncated ~45% of buckets mid-array at count=20.
      options: { temperature: 0.9, num_predict: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  return (await res.json()).response ?? "";
}

async function callOpenAi(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set — export it or use --provider ollama");
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

/**
 * Tolerant extraction — models wrap arrays in objects, fences, or prose, and
 * sometimes get cut off mid-array by the token cap.
 *
 * The SALVAGE stage is not optional politeness: the first full sweep lost 25 of
 * 55 buckets (45%) to truncated JSON. Every one had produced perfectly good
 * queries, and all of them were thrown away because the closing bracket was
 * missing. A generator that silently discards half its output looks identical
 * to a generator whose model refused the task — which is exactly how long that
 * bug would have survived. Salvage first, then raise the cap.
 */
function parseQueries(raw: string): string[] {
  const tryParse = (s: string): string[] | null => {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
      if (v && typeof v === "object") {
        for (const val of Object.values(v)) {
          if (Array.isArray(val)) return (val as unknown[]).filter((x) => typeof x === "string") as string[];
        }
      }
    } catch { /* fall through */ }
    return null;
  };

  const direct = tryParse(raw.trim());
  if (direct?.length) return direct;

  const m = raw.match(/\[[\s\S]*\]/);
  if (m) {
    const arr = tryParse(m[0]);
    if (arr?.length) return arr;
  }

  // SALVAGE: pull every complete double-quoted string out of a truncated or
  // otherwise malformed array. An unterminated final element is simply lost
  // instead of taking the whole batch with it.
  const salvaged: string[] = [];
  for (const mm of raw.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const s = mm[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
    // Skip JSON keys and single tokens — real queries have spaces.
    if (s.length > 8 && s.includes(" ")) salvaged.push(s);
  }
  return salvaged;
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
  const provider = (flag("--provider") ?? "ollama") as Provider;
  const count = parseInt(flag("--count") ?? "20", 10);
  const onlyIntent = flag("--intent");
  const onlyAction = flag("--action");
  const dryRun = args.includes("--dry-run");

  const specs = loadSpecs().filter((s) => s.intent !== "UNKNOWN");
  const heldOut = loadHeldOut();

  const buckets: Array<{ spec: Spec; action: string }> = [];
  for (const spec of specs) {
    if (onlyIntent && spec.intent !== onlyIntent) continue;
    for (const action of spec.supported_actions) {
      if (onlyAction && action !== onlyAction) continue;
      buckets.push({ spec, action });
    }
  }

  if (dryRun) {
    const b = buckets[0];
    console.log(`--- DRY RUN: ${b.spec.intent}|${b.action} (${buckets.length} buckets would run) ---\n`);
    console.log(buildPrompt(b.spec, b.action, count));
    return;
  }

  console.log(`[*] ${buckets.length} buckets · ${count}/bucket · provider=${provider} ` +
              `· model=${provider === "openai" ? OPENAI_MODEL : OLLAMA_MODEL}`);

  const rows: string[] = [];
  const seen = new Set<string>();
  let generated = 0, dropped = 0;

  for (const { spec, action } of buckets) {
    const prompt = buildPrompt(spec, action, count);
    let queries: string[] = [];
    try {
      const raw = provider === "openai" ? await callOpenAi(prompt) : await callOllama(prompt);
      queries = parseQueries(raw);
    } catch (e: any) {
      console.log(`  ✗ ${spec.intent}|${action}: ${e.message}`);
      continue;
    }

    let kept = 0;
    for (const q of queries) {
      const norm = q.toLowerCase().trim();
      if (!norm || norm.length < 3) continue;
      // A probe that collides with a held-out suite case stops being an
      // independent measurement, and a duplicate inflates whichever bucket
      // repeats it.
      if (heldOut.has(norm) || seen.has(norm)) { dropped++; continue; }
      seen.add(norm);
      rows.push(JSON.stringify({ utterance: q.trim(), intent: spec.intent, taskType: action }));
      kept++;
    }
    generated += kept;
    console.log(`  ${kept === 0 ? "✗" : "✓"} ${spec.intent}|${action}: ${kept}`);
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, rows.join("\n") + "\n");
  console.log(`\n[*] ${generated} labelled probes -> ${OUT_PATH}  (dropped ${dropped} dup/held-out)`);
  console.log(`[*] Score the CURRENT model without retraining:`);
  console.log(`      cd v6/training_pipeline && ./.venv/bin/python probe_eval.py`);
}

main().catch((e) => { console.error(e); process.exit(1); });
