/**
 * Blind relabel — removes label noise from the probe set.
 *
 * WHY THIS EXISTS
 * bucketProbe.ts labels each query "by construction": we asked for
 * SIP_VS_PREPAY|SUMMARY, so whatever came back is tagged SUMMARY. That
 * guarantee breaks when the LLM cannot honour the target taskType, and it
 * breaks silently. The first sweep proved it: SIP_VS_PREPAY|SUMMARY scored
 * 0/20 while intent accuracy was 100%, because every generated query was
 * comparison-shaped ("SIP karun ya loan prepay?") and the trained model
 * correctly answered COMPARISON. The model was right; the label was wrong. We
 * were about to spend a training run fixing a phantom.
 *
 * This pass re-asks the LLM to classify its own queries BLIND — given the full
 * taxonomy but NOT told which bucket the query was generated for. Rows where
 * the blind label disagrees with the requested bucket are quarantined rather
 * than deleted: a disagreement is evidence about the TAXONOMY (two buckets
 * that cannot be told apart) as much as about the query, and that signal is
 * worth keeping.
 *
 * Batches 25 queries per call to keep this cheap — the whole 1,000-row set is
 * roughly 40 calls.
 *
 * Usage:
 *   ./scripts/run-ts.sh src/knowledge/probeRelabel.ts
 *   ... --provider openai
 *   ... --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_DIR = path.resolve(__dirname, "specs");
const BENCH = path.resolve(__dirname, "../../v6/training_pipeline/benchmarks");
const PROBE_PATH = path.join(BENCH, "probe_set.jsonl");
const CLEAN_PATH = path.join(BENCH, "probe_set.clean.jsonl");
const QUARANTINE_PATH = path.join(BENCH, "probe_set.disputed.jsonl");

type Provider = "ollama" | "openai";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.PROBE_MODEL || "gpt-oss:20b-cloud";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const BATCH = 25;

interface Row { utterance: string; intent: string; taskType: string; }

function taxonomyBlock(): string {
  const specs = fs.readdirSync(SPEC_DIR)
    .filter((f) => f.endsWith(".intent.json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(SPEC_DIR, f), "utf-8")));
  return specs
    .map((s: any) => `${s.intent}: ${s.supported_actions.join("/")}`)
    .join("\n");
}

/** Blind: the batch is shuffled and carries no hint of its source bucket. */
function buildPrompt(batch: Row[], taxonomy: string): string {
  return `Classify each finance-app query into exactly one intent and taskType.

VALID INTENTS AND THEIR TASKTYPES:
${taxonomy}

TASKTYPE MEANINGS:
SUMMARY=plain readout · ANALYSIS=why it is so · INSIGHTS=notable findings
TREND=direction over periods · COMPARISON=two things contrasted
STATUS=on track or not · ALLOCATION=how to divide money · WHAT_IF=hypothetical
STRATEGY=what approach · SCHEDULE=what is due when · RISK=over-exposed
CREATE=record new · UPDATE=correct existing · DELETE=remove existing

QUERIES:
${batch.map((r, i) => `${i + 1}. ${r.utterance}`).join("\n")}

Return ONLY a JSON array of ${batch.length} objects, in the same order:
[{"n":1,"intent":"X","taskType":"Y"}, ...]`;
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
      options: { temperature: 0.1, num_predict: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return (await res.json()).response ?? "";
}

async function callOpenAi(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content ?? "";
}

/** Same salvage discipline as bucketProbe: never lose a batch to a missing bracket. */
function parseLabels(raw: string): Array<{ n: number; intent: string; taskType: string }> {
  const grab = (s: string): any[] | null => {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        for (const val of Object.values(v)) if (Array.isArray(val)) return val as any[];
      }
    } catch { /* fall through */ }
    return null;
  };
  const direct = grab(raw.trim());
  if (direct?.length) return direct;
  const m = raw.match(/\[[\s\S]*\]/);
  if (m) {
    const a = grab(m[0]);
    if (a?.length) return a;
  }
  const out: any[] = [];
  for (const mm of raw.matchAll(/\{[^{}]*"intent"[^{}]*\}/g)) {
    try { out.push(JSON.parse(mm[0])); } catch { /* skip */ }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const provider = (args.includes("--provider") ? args[args.indexOf("--provider") + 1] : "ollama") as Provider;
  const dryRun = args.includes("--dry-run");

  const rows: Row[] = fs.readFileSync(PROBE_PATH, "utf-8").split("\n")
    .filter((l) => l.trim()).map((l) => JSON.parse(l));
  const taxonomy = taxonomyBlock();

  if (dryRun) {
    console.log(buildPrompt(rows.slice(0, 5), taxonomy));
    return;
  }

  console.log(`[*] blind-relabelling ${rows.length} probes in batches of ${BATCH} (provider=${provider})`);

  const clean: Row[] = [];
  const disputed: Array<Row & { blindIntent: string; blindTaskType: string }> = [];
  let unlabelled = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    let labels: Array<{ n: number; intent: string; taskType: string }> = [];
    try {
      const raw = provider === "openai" ? await callOpenAi(buildPrompt(batch, taxonomy))
                                        : await callOllama(buildPrompt(batch, taxonomy));
      labels = parseLabels(raw);
    } catch (e: any) {
      console.log(`  ✗ batch ${i / BATCH + 1}: ${e.message}`);
    }

    const byN = new Map(labels.map((l) => [Number(l.n), l]));
    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const lab = byN.get(j + 1);
      if (!lab?.intent) {
        // Unjudged rows stay in the clean set — absence of a second opinion is
        // not evidence against the original label.
        clean.push(row); unlabelled++; continue;
      }
      if (lab.intent === row.intent && lab.taskType === row.taskType) clean.push(row);
      else disputed.push({ ...row, blindIntent: lab.intent, blindTaskType: String(lab.taskType ?? "?") });
    }
    process.stdout.write(`\r  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(rows.length / BATCH)} · clean ${clean.length} · disputed ${disputed.length}   `);
  }

  fs.writeFileSync(CLEAN_PATH, clean.map((r) => JSON.stringify(r)).join("\n") + "\n");
  fs.writeFileSync(QUARANTINE_PATH, disputed.map((r) => JSON.stringify(r)).join("\n") + "\n");

  console.log(`\n\n[*] clean     ${clean.length}  -> ${path.basename(CLEAN_PATH)}`);
  console.log(`[*] disputed  ${disputed.length}  -> ${path.basename(QUARANTINE_PATH)}`);
  if (unlabelled) console.log(`[*] ${unlabelled} rows got no second opinion (kept as clean)`);

  // Buckets where the generator and the blind judge disagree most are candidates
  // for a taxonomy problem, not a data problem.
  const byBucket = new Map<string, number>();
  for (const d of disputed) {
    const k = `${d.intent}|${d.taskType}`;
    byBucket.set(k, (byBucket.get(k) ?? 0) + 1);
  }
  const worst = [...byBucket.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (worst.length) {
    console.log(`\nMOST-DISPUTED BUCKETS (generator vs blind judge):`);
    for (const [b, n] of worst) console.log(`  ${String(n).padStart(4)}  ${b}`);
  }
  console.log(`\n[*] Score the clean set:`);
  console.log(`      cd v6/training_pipeline && ./.venv/bin/python probe_eval.py exported_model benchmarks/probe_set.clean.jsonl`);
}

main().catch((e) => { console.error(e); process.exit(1); });
