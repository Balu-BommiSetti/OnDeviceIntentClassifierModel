/**
 * QA Scenario Suite builder.
 *
 * Expands qa_scenarios.source.json (parametrized case definitions) into the
 * flat, executable suite at v6/training_pipeline/benchmarks/qa_scenarios.jsonl.
 *
 * Design rules:
 *  - Deterministic: seeded RNG (mulberry32, seed 42) so a diff in the output
 *    always means the SOURCE changed, never that the sampler rolled differently.
 *    Same principle as buildRegressionSuite.ts's fixed fillers.
 *  - Templates use {slot} placeholders; a slot whose values are arrays is
 *    addressed as {slot.0}/{slot.1} (paired values, e.g. period1/period2 —
 *    pairing keeps roles correlated instead of sampling nonsense like
 *    "June vs June").
 *  - Substitution is applied to the utterance AND recursively to every string
 *    in `expected`, so expected entity values stay in sync with the surface
 *    text by construction.
 *  - Sentinel expected-values (__CONTAINS_TO_DATE__, __IMPLICIT_SECOND__,
 *    __CURRENT_UNIT__, __EXPLICIT_SPAN__) mark assertions whose exact span is
 *    a pending design decision; the harness treats them as fuzzy matches.
 *  - This suite must NEVER enter training data. validate.ts's leakage check
 *    compares training utterances against this file.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, "qa_scenarios.source.json");
const OUTPUT = path.resolve(__dirname, "../../../v6/training_pipeline/benchmarks/qa_scenarios.jsonl");

type SlotValue = string | string[];
interface SourceCase {
  utterance?: string;
  template?: string;
  slots?: Record<string, SlotValue[]>;
  sample?: number;
  context?: unknown;
  requires_market_normalization?: boolean;
  expected: unknown;
  status_today: string;
  notes?: string;
}
interface SourceClass {
  id: string;
  name: string;
  description: string;
  cases: SourceCase[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(42);

/** Resolve "{slot}" or "{slot.i}" against one combo of slot values. */
function substitute(text: string, combo: Record<string, SlotValue>): string {
  return text.replace(/\{([a-zA-Z_]+)(?:\.(\d+))?\}/g, (whole, name, idx) => {
    const v = combo[name];
    if (v === undefined) return whole; // not a slot (e.g. sentinel) — leave as-is
    if (idx !== undefined) {
      if (!Array.isArray(v)) throw new Error(`Slot '${name}' is scalar but indexed as ${whole}`);
      return v[Number(idx)];
    }
    if (Array.isArray(v)) throw new Error(`Slot '${name}' is paired — index it as {${name}.0}`);
    return v;
  });
}

function substituteDeep<T>(value: T, combo: Record<string, SlotValue>): T {
  if (typeof value === "string") return substitute(value, combo) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => substituteDeep(v, combo)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = substituteDeep(v, combo);
    return out as unknown as T;
  }
  return value;
}

function cartesian(slots: Record<string, SlotValue[]>): Record<string, SlotValue>[] {
  let combos: Record<string, SlotValue>[] = [{}];
  for (const [name, values] of Object.entries(slots)) {
    const next: Record<string, SlotValue>[] = [];
    for (const combo of combos) for (const v of values) next.push({ ...combo, [name]: v });
    combos = next;
  }
  return combos;
}

/** Deterministic Fisher-Yates using the shared seeded rng. */
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function main(): void {
  const source = JSON.parse(fs.readFileSync(SOURCE, "utf-8")) as { version: string; classes: SourceClass[] };
  const rows: Record<string, unknown>[] = [];
  const statsByClass = new Map<string, number>();
  const statsByStatus = new Map<string, number>();
  const seen = new Set<string>();

  for (const cls of source.classes) {
    let counter = 0;
    for (const c of cls.cases) {
      const combos: Record<string, SlotValue>[] = c.template
        ? (() => {
            const all = cartesian(c.slots ?? {});
            return c.sample && c.sample < all.length ? shuffled(all).slice(0, c.sample) : all;
          })()
        : [{}];

      for (const combo of combos) {
        const utterance = c.template ? substitute(c.template, combo) : (c.utterance as string);
        if (seen.has(utterance.toLowerCase())) continue; // cross-template dedup
        seen.add(utterance.toLowerCase());
        counter += 1;
        rows.push({
          id: `${cls.id}-${String(counter).padStart(3, "0")}`,
          class: cls.name,
          utterance,
          ...(c.context !== undefined ? { context: c.context } : {}),
          ...(c.requires_market_normalization ? { requires_market_normalization: true } : {}),
          expected: substituteDeep(c.expected, combo),
          status_today: c.status_today,
          ...(c.notes ? { notes: c.notes } : {}),
        });
        statsByStatus.set(c.status_today, (statsByStatus.get(c.status_today) ?? 0) + 1);
      }
    }
    statsByClass.set(`${cls.id} ${cls.name}`, counter);
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

  console.log(`QA scenario suite v${source.version} -> ${path.relative(process.cwd(), OUTPUT)}`);
  console.log(`Total cases: ${rows.length}\n`);
  console.log("Per class:");
  for (const [k, v] of statsByClass) console.log(`  ${k.padEnd(38)} ${v}`);
  console.log("\nPer status_today:");
  for (const [k, v] of [...statsByStatus.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(32)} ${v}`);
}

main();
