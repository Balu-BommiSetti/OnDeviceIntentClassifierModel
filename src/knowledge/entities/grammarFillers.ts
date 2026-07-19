/**
 * Grammar-derived entity fillers (Phase 1).
 *
 * PERIOD filler values are derived from period.grammar.json — the same file
 * the app's TemporalResolver is tested against — instead of the hand-listed
 * DATE_RANGES arrays in src/config/generationConfig.ts. Two defects this fixes:
 *
 *  1. RANGE STARVATION. The old PERIOD pool held ~17 forms, none of them a
 *     numeric/word-number range, half-year, between-range, or to-date. The
 *     resolver understands all of those (12/12 grammar categories as of
 *     2026-07-18); the model had never seen one. Generator and resolver now
 *     read the same contract, so "supported by the resolver" and "present in
 *     training" cannot drift apart silently again.
 *
 *  2. DATE/PERIOD OVERLAP. "last week" appeared in BOTH pools, teaching the
 *     NER head contradictory tags for identical surface text. The grammar's
 *     boundary rule is now enforced in code: DATE is a POINT (a single day),
 *     PERIOD is a RANGE. assertNoDatePeriodOverlap() throws at generation
 *     time if the two pools ever intersect again.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GRAMMAR_PATH = path.resolve(__dirname, "period.grammar.json");

interface PeriodGrammar {
  version: string;
  lexicons: {
    WORD_NUMBERS: Record<string, number>;
    MONTHS: string[];
    MONTH_ABBREVIATIONS: string[];
  };
  categories: { id: string; surface_forms: string[]; examples: string[] }[];
}

export function loadPeriodGrammar(): PeriodGrammar {
  return JSON.parse(fs.readFileSync(GRAMMAR_PATH, "utf-8")) as PeriodGrammar;
}

const RANGE_UNITS = ["days", "weeks", "months", "quarters"] as const;
const CAL_UNITS = ["week", "month", "quarter", "year"] as const;

/**
 * Concrete PERIOD surface forms, one group per grammar category. Values are
 * literal user phrasings (not templates) because SLOT_VALUES fillers are
 * substituted verbatim and then BIO-tagged by exact token match.
 */
export function buildPeriodFillers(): string[] {
  const g = loadPeriodGrammar();
  const months = g.lexicons.MONTHS;
  const wordNumbers = Object.keys(g.lexicons.WORD_NUMBERS).filter((w) => w !== "couple of" && w !== "few");
  const out: string[] = [];

  // relative_this / relative_last / unit-before-last
  for (const u of CAL_UNITS) {
    out.push(`this ${u}`, `last ${u}`, `previous ${u}`, `the current ${u}`, `${u} before last`);
  }

  // numeric_range (digits) + lead-in variants
  for (const u of RANGE_UNITS) {
    for (const n of [2, 3, 6]) {
      out.push(`last ${n} ${u}`, `past ${n} ${u}`);
    }
    out.push(`in the last 6 ${u}`, `over the past 3 ${u}`);
  }

  // word_number_range — the "last two months" class
  for (const u of ["weeks", "months"]) {
    for (const w of wordNumbers.slice(0, 6)) out.push(`last ${w} ${u}`, `past ${w} ${u}`);
    out.push(`last couple of ${u}`, `past few ${u}`);
  }

  // absolute_month (bare + prefixed) and absolute_month_year
  for (const m of months) {
    const M = m[0].toUpperCase() + m.slice(1);
    out.push(M, `in ${M}`, `for ${M}`, `during ${M}`);
  }
  for (const m of ["January", "March", "May", "June", "September", "December"]) {
    out.push(`${m} 2025`, `in ${m} 2024`);
  }

  // fiscal_quarter
  out.push("Q1", "Q2", "Q3", "Q4", "this quarter", "last quarter", "the quarter before last");

  // half_year
  out.push("H1", "H2", "first half of the year", "second half of the year", "first half of 2025", "second half of 2025", "first six months of the year");

  // between_range
  const pairs: [string, string][] = [["March", "June"], ["Jan", "March"], ["April", "August"], ["January", "April"], ["July", "October"]];
  for (const [a, b] of pairs) out.push(`between ${a} and ${b}`, `from ${a} to ${b}`, `${a} through ${b}`);

  // to_date
  out.push("so far this month", "so far this year", "month to date", "year to date", "MTD", "YTD");

  // calendar_year
  out.push("this year", "last year", "in 2023", "in 2024", "for the year", "last fiscal year");

  // vague — kept deliberately: the resolver returns UNKNOWN/low for these and
  // the app clarifies. The MODEL must still learn they are PERIOD spans.
  out.push("recently", "lately", "these days");

  return [...new Set(out)];
}

/**
 * DATE fillers — POINTS only, per the grammar's boundary rule. Anything that
 * denotes a range belongs in PERIOD.
 */
export function buildDateFillers(): string[] {
  const out = [
    "today", "yesterday", "tomorrow", "last night", "this morning", "this afternoon",
    "this evening", "tonight", "just now", "the day before yesterday",
    "2 days ago", "3 days ago", "a week ago", "a month ago",
    "on Monday", "on Tuesday", "on Friday", "on Saturday", "on Sunday",
    "last Monday", "last Friday", "next Tuesday", "this coming Thursday",
    "on the 1st", "on the 15th", "on 15th March", "March 15", "June 5", "on 3rd April",
    "2024-03-15", "2025-01-09",
  ];
  return [...new Set(out)];
}

/** TARGETDATE — future-facing points/deadlines for goals. */
export function buildTargetDateFillers(): string[] {
  return [...new Set([
    "next year", "in 3 years", "in 5 years", "by December", "in 6 months", "by 2027", "by 2030",
    "by next March", "in 18 months", "before I turn 40", "by the end of the year", "in 2 years",
  ])];
}

/**
 * Enforces the grammar's DATE-vs-PERIOD boundary rule. Called by the
 * generator at startup so a future edit re-introducing an overlap fails the
 * build instead of quietly poisoning the NER head.
 */
export function assertNoDatePeriodOverlap(dates: string[], periods: string[]): void {
  const dateSet = new Set(dates.map((d) => d.toLowerCase()));
  const clashes = periods.filter((p) => dateSet.has(p.toLowerCase()));
  if (clashes.length > 0) {
    throw new Error(
      `DATE/PERIOD filler overlap (period.grammar.json boundary rule): ${clashes.join(", ")}. ` +
      `DATE is a POINT, PERIOD is a RANGE — a surface form must appear in exactly one pool.`
    );
  }
}
