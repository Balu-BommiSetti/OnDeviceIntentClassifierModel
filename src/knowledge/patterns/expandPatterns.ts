/**
 * Pattern-Expansion Engine (Phase 1).
 *
 * Generates NEW utterance-pattern SKELETONS per (intent, taskType) bucket to
 * clear validate.ts's MIN_DISTINCT_PATTERNS_PER_BUCKET floor (40). The
 * 2026-07-17 model scored 21.5% intent accuracy because the corpus had ~5.3
 * skeletons per bucket while train.py's template_aware_split holds out whole
 * skeletons — the model trained on ~4 phrasings and was tested on a 5th.
 *
 * CORE DESIGN DECISION — the LLM writes PATTERNS, never finished utterances:
 *   "how much did I blow on {CATEGORY} {PERIOD}"     ← what we ask for
 *   "how much did I blow on food last month"         ← what we do NOT ask for
 * Finished utterances would require the LLM to also tag entity spans, and a
 * mislabeled span silently poisons the NER head. Skeletons keep tagging
 * deterministic: generateFromSpec fills the slots and buildTags derives BIO
 * tags by exact token match, so tags are correct by construction.
 *
 * Every candidate is auto-validated before a human ever sees it:
 *   1. Placeholder legality — slots ⊆ the spec's required+optional entities
 *      (+ PERIOD1/PERIOD2 for COMPARISON). Catches invented slots.
 *   2. Required-entity presence — a CREATE pattern missing {AMOUNT} would
 *      generate rows the slot engine must immediately clarify.
 *   3. Skeleton dedup — normalized (slots erased, articles/whitespace
 *      collapsed) so "spent {AMOUNT} on {CATEGORY}" and "spent {AMOUNT} for
 *      {CATEGORY}" count as distinct but exact rephrasings do not.
 *   4. Cross-intent collision — the same skeleton must not appear under two
 *      intents (that is validate.ts's conflicting-labels failure, pre-empted).
 *   5. Eval-suite leakage — a pattern whose filled form could reproduce a
 *      held-out qa_scenarios/hard_cases utterance is rejected.
 *
 * Output is a REVIEW FILE (patterns.candidate.json), not a spec edit. Specs
 * are the source of truth; a human approves before mergePatterns.ts writes.
 *
 * Usage:
 *   npm run patterns:expand -- --dry-run
 *   npm run patterns:expand -- --intent SPENDING_ANALYSIS --action COMPARISON
 *   npm run patterns:expand -- --provider openai --append
 *
 * Flags: --intent X  --action Y  --provider ollama|openai  --append  --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs, IntentSpec } from "../index";
import { CATEGORIES } from "../../config/generationConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads repo-root .env (gitignored) so API keys don't have to be exported in
 * the caller's shell. Hand-rolled rather than importing dotenv because this
 * module is also compiled standalone by scripts/run-ts.sh, which resolves no
 * node_modules. Existing process.env values always win.
 */
function loadDotEnv(): void {
  const envPath = path.resolve(__dirname, "../../../.env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();
const DATASET = path.resolve(__dirname, "../../../exported_dataset/spec_dataset.jsonl");
const OUTPUT = path.resolve(__dirname, "patterns.candidate.json");
const EVAL_SUITES = [
  path.resolve(__dirname, "../../../v6/training_pipeline/benchmarks/qa_scenarios.jsonl"),
  path.resolve(__dirname, "../../../v6/training_pipeline/benchmarks/hard_cases.jsonl"),
];

const TARGET_PATTERNS_PER_BUCKET = 40; // mirrors validate.ts MIN_DISTINCT_PATTERNS_PER_BUCKET
// Patterns requested per LLM call. Small on purpose — see buildPrompt's note
// on reasoning models emitting nothing when the ask is large.
const BATCH_SIZE = Number(process.env.PATTERN_BATCH_SIZE || 15);
const MAX_BATCHES = Number(process.env.PATTERN_MAX_BATCHES || 6);

// ── Provider config ────────────────────────────────────────────────────────
// Two backends, same prompt and the same five validation rules. Start on
// Ollama for a cheap single-bucket trial, then switch to OpenAI for the bulk
// run by exporting OPENAI_API_KEY and passing --provider openai. Nothing else
// changes — validation, review, and merge are provider-agnostic.
type Provider = "ollama" | "openai";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.PATTERN_MODEL || "gpt-oss:20b-cloud";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

const PLACEHOLDER = /\{([A-Z_0-9]+)\}/g;

export interface CandidatePattern {
  intent: string;
  taskType: string;
  pattern: string;
  status: "approved" | "rejected";
  reason?: string;
}

/** Slots legal for a bucket: spec entities, plus comparison roles. */
function legalSlots(spec: IntentSpec, action: string): Set<string> {
  const slots = new Set<string>([...spec.required_entities, ...spec.optional_entities]);
  if (action === "COMPARISON") {
    // COMPARISON patterns may carry two distinct period spans; generateFromSpec
    // remaps PERIOD1/PERIOD2 back to PERIOD before tagging.
    if (slots.has("PERIOD")) { slots.add("PERIOD1"); slots.add("PERIOD2"); }
  }
  return slots;
}

/**
 * Normalized skeleton key for dedup: slot names erased (so {CATEGORY} and
 * {MERCHANT} in the same position don't both count), articles dropped,
 * punctuation and whitespace collapsed.
 */
export function skeletonKey(pattern: string): string {
  // Slots are erased BEFORE lowercasing — PLACEHOLDER matches uppercase slot
  // names only, so lowercasing first would leave "{amount}" in the key and
  // silently defeat dedup, cross-intent collision, and leakage checks.
  return pattern
    .replace(PLACEHOLDER, " ")
    .toLowerCase()
    .replace(/\b(a|an|the|my|some)\b/g, " ")
    .replace(/[^\w \s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * PER-INTENT taskType meaning. A taskType label does NOT mean the same thing
 * everywhere: ANALYSIS is "why is my spending high" for SPENDING_ANALYSIS but
 * "can I afford this" for AFFORDABILITY_CHECK and "break down this loan" for
 * LOAN_ANALYSIS. A single global table told the generator to explain "why" for
 * affordability, and the global ANALYSIS cue then rejected 59 of its own
 * outputs — the prompt and the validator disagreeing because both assumed one
 * meaning. Entries here override ACTION_SEMANTICS for that intent.
 */
const INTENT_ACTION_SEMANTICS: Record<string, Record<string, string>> = {
  AFFORDABILITY_CHECK: {
    ANALYSIS: "ask whether a specific purchase is AFFORDABLE — can I buy this, is it within reach, should I go ahead",
    WHAT_IF: "vary the terms of a purchase — a different down payment, tenure, or interest rate",
  },
  LOAN_ANALYSIS: {
    ANALYSIS: "ask for a breakdown of an existing loan — its cost, interest, or how the payments are structured",
  },
  CASHFLOW_WARNING: {
    // Third intent where the global SUMMARY meaning ("report the total") was
    // wrong: this is a RISK intent. 44 of 50 generated patterns were neutral
    // accounting totals belonging to SPENDING_ANALYSIS or NET_WORTH_CHECK,
    // which is why precision sat at 0.50 while recall was 0.89 — it absorbed
    // other intents' questions.
    SUMMARY: "express CONCERN about running short of money — will I run out, can I cover what's coming, how long will my money last, is money going out faster than it comes in. NOT a neutral balance or spending total",
  },
  SIP_VS_PREPAY: {
    SUMMARY: "ask whether to INVEST spare money or PREPAY a loan with it — which of the two is the better use of surplus cash",
  },
  NET_WORTH_CHECK: {
    SUMMARY: "ask for overall NET WORTH or total position — what am I worth, assets minus liabilities, my overall financial standing",
  },
  BUDGET_PLANNING: {
    // The global SUMMARY meaning ("report the total for one period") is
    // SPENDING_ANALYSIS's meaning. Applied to budget it made the generator
    // emit plain spending queries — 75 rejected in one run by rule 12. A
    // budget SUMMARY is about the PLAN's health, not transaction totals.
    SUMMARY: "ask how the BUDGET ITSELF is doing overall — am I on track against my plan, is my budget healthy, how are my limits holding up. NOT how much was spent (that is a different intent)",
    STATUS: "ask whether spending has BREACHED or is close to a specific budget LIMIT — over/under, how much of the allowance is left",
  },
};

function semanticsFor(intent: string, action: string): string {
  return INTENT_ACTION_SEMANTICS[intent]?.[action] ?? ACTION_SEMANTICS[action] ?? action;
}

/**
 * What each taskType MEANS, in the user's terms. Fed to the prompt so the
 * model knows what it is being asked for, and mirrored by checkActionShape()
 * so the validator enforces it.
 */
const ACTION_SEMANTICS: Record<string, string> = {
  CREATE: "record a NEW entry (log something that happened)",
  UPDATE: "change an entry that already exists",
  DELETE: "remove an entry",
  SUMMARY: "report the TOTAL for ONE time period — just the numbers",
  BREAKDOWN: "ask for a percentage or categorical DISTRIBUTION of expenses — where did my money go, pie chart",
  ROOT_CAUSE: "explain WHY spending is what it is — which categories or merchants are DRIVING it. The user is asking for a cause",
  TREND: "show whether spending is going UP or DOWN across SEVERAL months — a trajectory over time",
  COMPARISON: "compare TWO different time periods or categories against each other",
  TOP_SPENDERS: "ask for a RANKED LIST of the highest expenses or top merchants",
  ANOMALY_DETECTION: "ask to flag UNUSUAL spending, spikes, or anomalies in the budget",
  SUBSCRIPTIONS: "ask to find RECURRING charges, fixed fees, or forgotten subscriptions",
  AVERAGES: "ask for the AVERAGE or run-rate of spending (e.g. per day or per month)",
  WHAT_IF: "project a hypothetical scenario ('what if I paid X more')",
  // Debt taskTypes. Each maps to a DIFFERENT DebtFreedomEngine output, so the
  // wording that distinguishes them has to reach the model.
  STRATEGY: "ask which loan to pay off FIRST, or in what ORDER — snowball vs avalanche, prioritising between loans",
  SCHEDULE: "ask how a payment SPLITS between interest and principal, or for the amortization/repayment table",
  RISK: "ask whether the debt load is SAFE or dangerous — leverage, EMI-to-income burden, debt health",
  // Budget taskTypes.
  STATUS: "ask whether spending has BREACHED or is close to a budget limit — over/under, how much is left, which categories overspent",
  ALLOCATION: "ask how income SHOULD be divided — what the budget ought to be, how much to set aside, a recommended split",
};

/**
 * Entity vocabularies used to detect literal values baked into a pattern.
 * Sourced from the same pools generateFromSpec fills slots from, so "a value
 * the generator would have produced" is exactly what gets flagged.
 */
const LITERAL_POOLS: Record<string, string[]> = {
  CATEGORY: CATEGORIES,
  MERCHANT: ["Amazon", "Netflix", "Uber", "Swiggy", "Starbucks", "Walmart", "Flipkart", "Zomato"],
  LIABILITYTYPE: ["home loan", "car loan", "personal loan", "credit card debt", "education loan"],
  ASSETTYPE: ["gold", "mutual fund", "stocks", "property", "bitcoin", "fixed deposit"],
};
// Plural/possessive-tolerant forms that still denote the same category.
const LITERAL_ALIASES: Record<string, string> = {
  grocery: "CATEGORY", groceries: "CATEGORY", restaurant: "CATEGORY", restaurants: "CATEGORY",
  utility: "CATEGORY", utilities: "CATEGORY", entertainment: "CATEGORY", travel: "CATEGORY",
  rent: "CATEGORY", fuel: "CATEGORY", petrol: "CATEGORY", food: "CATEGORY", dining: "CATEGORY",
};

export function literalSlotFor(value: string): string {
  const v = value.toLowerCase();
  if (LITERAL_ALIASES[v]) return LITERAL_ALIASES[v];
  for (const [slot, pool] of Object.entries(LITERAL_POOLS)) {
    if (pool.some((x) => x.toLowerCase() === v)) return slot;
  }
  return "CATEGORY";
}

/**
 * Returns the first literal entity value found OUTSIDE a placeholder, or null.
 * Only flags a value whose slot the spec actually declares — "gold" in an
 * intent with no ASSETTYPE slot is just a word.
 */
export function findLiteralEntityValue(pattern: string, spec: IntentSpec): string | null {
  const declared = new Set([...spec.required_entities, ...spec.optional_entities]);
  const bare = pattern.replace(PLACEHOLDER, " ").toLowerCase();
  const candidates: string[] = [];
  for (const [slot, pool] of Object.entries(LITERAL_POOLS)) {
    if (declared.has(slot)) candidates.push(...pool.map((x) => x.toLowerCase()));
  }
  for (const [alias, slot] of Object.entries(LITERAL_ALIASES)) {
    if (declared.has(slot)) candidates.push(alias);
  }
  // Longest-first so "dining out" is reported over "dining".
  for (const c of [...new Set(candidates)].sort((a, b) => b.length - a.length)) {
    if (new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(bare)) return c;
  }
  return null;
}

const TOP_SPENDERS_CUE = /\b(top|biggest|highest|most|frequent|worst|largest)\b/i;
const ANOMALY_CUE = /\b(unusual|odd|spike|anomaly|weird|surprise|anomalies|spikes|abnormal|deviat\w*|suspicious|fraud)\b/i;
const SUBSCRIPTIONS_CUE = /\b(subscription|recurring|fixed|regular|hidden|subscription|monthly fee|repeat\w*)\b/i;
const BREAKDOWN_CUE = /\b(breakdown|distribution|pie chart|where .* money (go|went)|percentage|proportion|split by)\b/i;
const AVERAGES_CUE = /\b(average|per day|per month|per week|run rate|velocity|mean|typically|typical)\b/i;

/** Comparison markers/cues — mirrors period.grammar.json#comparison. */
const COMPARISON_CUE =
  /\b(vs\.?|versus|compared\s+(?:to|with)|compare[ds]?|against|than|between|difference|differ|change[ds]?|evolved?|increase[ds]?|decrease[ds]?|higher|lower|more|less|up from|down from|trend)\b/i;
const WHAT_IF_CUE = /\b(what if|if I|suppose|imagine|say I|assuming|were to|project|scenario|what happens if|how much (sooner|earlier|faster))\b/i;
/** STRATEGY — ordering/prioritising between loans. */
const STRATEGY_CUE =
  /\b(first|order|sequence|priorit(y|ise|ize|izing|ising)|snowball|avalanche|which loan|which debt|rank|strategy|approach|method|fastest way|best way|tackle|attack|knock out)\b/i;
/** SCHEDULE — interest/principal split or the amortization table. */
const SCHEDULE_CUE =
  /\b(interest|principal|amortis|amortiz|schedule|breakdown|break down|split|instal?ment|repayment table|goes to|portion|how much of)\b/i;
/** Does this intent answer a payoff TRAJECTORY (vs a point-in-time state)? */
function intentIsDebtTrajectory(intent: string): boolean {
  return intent === "DEBT_FREEDOM_ANALYSIS";
}
/** TRAJECTORY — "when will it be gone / how long / payoff". */
const TRAJECTORY_CUE =
  /\b(when|how long|how soon|how many (months|years|emis|payments)|until|till|by \{TARGETDATE\}|payoff|pay off|paid off|debt[- ]free|clear(ed|ing)?|settle[ds]?|wrap up|finish|done with|left to pay|remaining|roadmap|timeline|projection|forecast)\b/i;
/** STATE — a point-in-time attribute of a loan. */
const STATE_CUE =
  /\b(balance|rate|interest rate|details|status|amount|outstanding|principal|tenure|lender|bank|current|right now|today)\b/i;

/**
 * Does the pattern reference the BUDGET concept at all? Note the \w* suffixes:
 * an earlier version used \b after a prefix ("allocat\b"), which cannot match
 * "allocated" — the same word-boundary mistake that has now bitten three
 * separate cue regexes in this file.
 */
const BUDGET_REF =
  /\b(budget\w*|limit\w*|cap|caps|capped|allocat\w*|set aside|put aside|reserved?|earmark\w*|envelope|quota|threshold|planned|plan for|target\w*|over ?spend\w*|overspent|within)\b/i;

/** CASHFLOW_WARNING — shortfall risk, not neutral accounting. */
const CASHFLOW_RISK_CUE =
  /\b(run\s?out|running\s?(out|low)|short\w*|shortfall|cover\w*|afford\w*|last\w*|enough|survive\w*|tight|squeez\w*|struggl\w*|risk\w*|warn\w*|trouble|overdraw\w*|negative|deficit|burn\s?rate|runway|make it (to|through)|get through|stretch\w*|dry|broke)\b/i;

/** STATUS — breached or approaching a limit. */
// \w* suffixes throughout: a bare stem inside \b(...)\b cannot match its own
// inflections ("remain" never matches "remains"), which is the single most
// repeated mistake in this file — it has now bitten ANALYSIS_CUE, the
// affordability cue, BUDGET_REF and this one. Prefer stem + \w* over listing
// every form by hand.
const STATUS_CUE =
  /\b(over|under|within|exceed\w*|breach\w*|blown|blow|left|remain\w*|cap|caps|limit\w*|overspend\w*|overspent|on track|still have|close to|nearly|about to)\b/i;
/** ALLOCATION — what the budget SHOULD be, not what it is. */
const ALLOCATION_CUE =
  /\b(should|ought|recommend|suggest|advise|split|divide|allocate|allocation|set aside|put aside|aside for|ideal|sensible|plan for|how much to)\b/i;

/** RISK — safety/leverage/burden of the debt load. */
const RISK_CUE =
  /\b(risk|risky|danger|dangerous|safe|unsafe|over ?leverag|too much|too high|burden|health|healthy|sustainab|manageable|worried|comfortable|stretched|exposure|ratio|percent|% )\b/i;
/** Trajectory-over-time cues (TREND) — deliberately excludes "vs/than", which mark a COMPARISON. */
const TREND_CUE =
  /\b(trend|trending|over time|month over month|each month|every month|by month|monthly|across months|going up|going down|climbing|rising|falling|creeping|changed over|evolv\w*|trajectory|pattern over|history|historical)\b/i;
/**
 * Causal cues (ANALYSIS) — the user wants a REASON or the DRIVERS, not a total.
 * The first version anchored the driver/cause words to a preceding "what"
 * (within 12 chars),
 * which rejected 100 legitimate patterns in a live run: "are DRIVING my bills",
 * "the CAUSES of the surge", "merchants CONTRIBUTING to". Driver vocabulary is
 * now matched on its own, and the SUMMARY guard below keeps the two apart.
 */
const ANALYSIS_CUE = new RegExp(
  [
    "\\bwhy\\b",
    "\\bdriv(e|es|en|ing|er|ers)\\b",
    "\\bcaus(e|es|ed|ing)\\b",
    "\\breason(s)?\\b",
    "\\bexplain(s|ed|ing)?\\b",
    "\\bcontribut(e|es|ing|or|ors|ion)\\b",
    "\\bresponsible\\b|\\baccountable\\b|\\bculprit\\b",
    "\\bbehind my\\b|\\bcoming from\\b|\\bled to\\b|\\bdue to\\b",
    "\\bsources? of\\b|\\bfactors?\\b",
    "\\beating\\b|\\bblowing\\b|\\bgoing wrong\\b",
    "\\bso high\\b|\\bso much\\b|\\bspik(e|ed|es|ing)\\b|\\bsurge\\b|\\bpeak(ed|s)?\\b",
    "\\bwhere.{0,15}money (go|going|went)\\b",
    "\\bwhat happened\\b",
  ].join("|"),
  "i"
);

/**
 * Semantic shape check per taskType. Deliberately narrow: it only rejects
 * what is provably off-shape, so it never blocks a legitimately creative
 * phrasing. COMPARISON is the strict one because it is the taskType whose
 * mislabeling does the most damage (it drives a two-period SQL path).
 */
/** Shape check for intents whose ANALYSIS is not a "why" question. */
export function checkAffordabilityShape(pattern: string, intent: string): { ok: boolean; reason?: string } {
  if (intent === "AFFORDABILITY_CHECK") {
    // Deliberately BROAD. A narrow version rejected 64 of its own valid
    // outputs — "is a {AMOUNT} {CATEGORY} within my budget", "do my savings
    // cover a {AMOUNT}", "will it fit my spending plan". Third time this
    // failure shape has appeared (ANALYSIS_CUE, then STATUS, now this): when
    // a cue regex is the gate, err wide and let the other rules catch junk.
    const cue = new RegExp([
      "\\bafford(able|ability)?\\b",
      "\\b(can|could|should|shall|will|would)\\s+I\\b",
      "\\bwithin\\s+(my\\s+)?(budget|reach|means|limit)\\b",
      "\\btoo\\s+(much|expensive|pricey|costly|big)\\b",
      "\\b(manage\\w*|handle\\w*|swing\\w*|stretch\\w*|justify|justifie\\w*|cover\\w*|fit|fits)\\b",
      "\\b(comfortab\\w*|realistic|feasib\\w*|doable|sensib\\w*|wise)\\b",
      "\\bworth\\s+(it|the)\\b|\\bgo\\s+ahead\\b|\\bgreen\\s?light\\b",
      "\\b(enough|savings cover|hurt my|dent my|damage my)\\b",
      "\\bbudget for\\b|\\bspending plan\\b|\\bmake sense\\b",
    ].join("|"), "i");
    if (!cue.test(pattern)) {
      return { ok: false, reason: "not an AFFORDABILITY question: needs afford/can I/should I/within reach/too much wording" };
    }
  }
  return { ok: true };
}

export function checkActionShape(pattern: string, action: string): { ok: boolean; reason?: string } {
  if (action === "COMPARISON") {
    const periodSlots = (pattern.match(/\{PERIOD[12]?\}/g) ?? []).length;
    const hasTwoPeriods = /\{PERIOD1\}/.test(pattern) && /\{PERIOD2\}/.test(pattern);
    const hasCue = COMPARISON_CUE.test(pattern);
    // Either an explicit two-period pattern, or one period plus a comparative
    // cue (the app infers the current period as the first role).
    if (!hasTwoPeriods && !(periodSlots >= 1 && hasCue)) {
      return { ok: false, reason: "not a COMPARISON: needs {PERIOD1}+{PERIOD2}, or one period plus a comparison word (vs / than / compared to / more)" };
    }
    return { ok: true };
  }
  if (action === "TREND") {
    // A trend is a trajectory over time. Reject anything that reads as a
    // two-period comparison (that's COMPARISON) or a flat total (SUMMARY).
    if (/\{PERIOD1\}|\{PERIOD2\}/.test(pattern)) {
      return { ok: false, reason: "TREND must not use comparison period slots — two periods is a COMPARISON" };
    }
    if (!TREND_CUE.test(pattern)) {
      return { ok: false, reason: "not a TREND: needs a trajectory word (trend / over time / going up / each month / changed over)" };
    }
    return { ok: true };
  }
  if (action === "TOP_SPENDERS" && !TOP_SPENDERS_CUE.test(pattern)) {
    return { ok: false, reason: "not a TOP_SPENDERS question: needs top/biggest/highest/most wording" };
  }
  if (action === "ANOMALY_DETECTION" && !ANOMALY_CUE.test(pattern)) {
    return { ok: false, reason: "not an ANOMALY_DETECTION question: needs unusual/spike/anomaly/surprise wording" };
  }
  if (action === "SUBSCRIPTIONS" && !SUBSCRIPTIONS_CUE.test(pattern)) {
    return { ok: false, reason: "not a SUBSCRIPTIONS question: needs recurring/subscription/fixed/regular wording" };
  }
  if (action === "BREAKDOWN" && !BREAKDOWN_CUE.test(pattern)) {
    return { ok: false, reason: "not a BREAKDOWN question: needs breakdown/distribution/where money went wording" };
  }
  if (action === "AVERAGES" && !AVERAGES_CUE.test(pattern)) {
    return { ok: false, reason: "not an AVERAGES question: needs average/per day/run rate wording" };
  }
  if (action === "ROOT_CAUSE" && !ANALYSIS_CUE.test(pattern)) {
    return { ok: false, reason: "not a ROOT_CAUSE question: must ask WHY or what is driving it" };
  }
  if (action === "SUMMARY" && ANALYSIS_CUE.test(pattern)) {
    return { ok: false, reason: "SUMMARY must not ask WHY — that is ROOT_CAUSE" };
  }
  // WHAT_IF hygiene for debt: a pattern must not put a ONE-TIME windfall word
  // next to {EXTRAPAYMENT} (recurring) or a RECURRING word next to {LUMPSUM}.
  // Getting this backwards makes the engine model a one-off bonus as a monthly
  // payment and report a payoff date years early.
  {
    const hasExtra = /\{EXTRAPAYMENT\}/.test(pattern);
    const hasLump = /\{LUMPSUM\}/.test(pattern);
    // Test the PROSE only. Placeholder names must be stripped first: "{LUMPSUM}"
    // itself matches /lump ?sum/, which made the guard reject every combined
    // scenario. Also note a COMBINED pattern (lump sum now + extra monthly) is
    // legitimate — the engine takes both — so only flag when the wording
    // contradicts the ONLY money slot present.
    const prose = pattern.replace(PLACEHOLDER, " ");
    // "bonus" alone is ambiguous ("a bonus payment each month" = recurring), so
    // it only counts as a windfall when NOT paired with recurring wording.
    const recurringWord = /\b(every month|each month|each period|monthly|per month|every year|recurring|ongoing)\b/i.test(prose);
    const windfallWord = /\b(windfall|one[- ]?time|lump sum|gratuity|maturity|inheritance|tax refund)\b/i.test(prose)
      || (/\bbonus\b/i.test(prose) && !recurringWord);

    if (hasExtra && !hasLump && windfallWord) {
      return { ok: false, reason: "windfall wording with {EXTRAPAYMENT} (recurring) — use {LUMPSUM} for one-time money" };
    }
    if (hasLump && !hasExtra && recurringWord) {
      return { ok: false, reason: "recurring wording with {LUMPSUM} (one-time) — use {EXTRAPAYMENT} for repeating money" };
    }
  }
  // Debt shape rules — same discipline as COMPARISON: the taskType drives a
  // different engine path, so a pattern that does not actually ask that
  // question would train the head on noise.
  if (action === "STRATEGY" && !STRATEGY_CUE.test(pattern)) {
    return { ok: false, reason: "not a STRATEGY: needs ordering/priority wording (which first / what order / snowball / avalanche / prioritise)" };
  }
  if (action === "SCHEDULE" && !SCHEDULE_CUE.test(pattern)) {
    return { ok: false, reason: "not a SCHEDULE: needs interest-vs-principal or amortization wording (split / breakdown / schedule / how much is interest)" };
  }
  if (action === "RISK" && !RISK_CUE.test(pattern)) {
    return { ok: false, reason: "not a RISK question: needs safety/burden wording (risky / dangerous / over-leveraged / too much / burden / healthy / sustainable)" };
  }
  if (action === "STATUS" && !STATUS_CUE.test(pattern)) {
    return { ok: false, reason: "not a STATUS: needs over/under/limit/left/remaining wording — a plain 'how is my budget' is SUMMARY" };
  }
  if (action === "ALLOCATION" && !ALLOCATION_CUE.test(pattern)) {
    return { ok: false, reason: "not an ALLOCATION: needs should/recommend/split/set aside wording — reporting current state is SUMMARY or STATUS" };
  }
  if (action === "WHAT_IF" && !WHAT_IF_CUE.test(pattern)) {
    return { ok: false, reason: "not a WHAT_IF: needs a hypothetical cue (what if / if I / suppose)" };
  }
  // SUMMARY must NOT read as a comparison (the inverse error).
  if (action === "SUMMARY" && /\{PERIOD1\}|\{PERIOD2\}/.test(pattern)) {
    return { ok: false, reason: "SUMMARY must not use comparison period slots — that is a COMPARISON" };
  }
  return { ok: true };
}

export interface ValidationContext {
  spec: IntentSpec;
  action: string;
  existingKeys: Set<string>;      // skeletons already in this bucket
  crossIntentKeys: Map<string, string>; // skeleton -> owning intent
  evalSuiteKeys: Set<string>;     // normalized held-out utterances
}

/**
 * Repairs an unclosed placeholder ("{PERIOD2" -> "{PERIOD2}").
 *
 * Models routinely drop the closing brace, and because PLACEHOLDER requires
 * it, the fragment reads as literal TEXT — so a broken pattern passes every
 * slot check and silently trains "{PERIOD2" as words. Observed live: 12 of 42
 * candidates. Repair is applied only when the fragment is a KNOWN slot name,
 * which makes it unambiguous; anything else is left alone and rejected by
 * assertBalancedPlaceholders below.
 */
export function repairPlaceholders(pattern: string, legal: Set<string>): string {
  // The lookahead must exclude BOTH a closing brace and further slot
  // characters: with only (?!\}), the greedy [A-Z_0-9]+ backtracks so
  // "{PERIOD1}" matches as "{PERIOD" + "1}" and gets "repaired" into
  // "{PERIOD}1}". Requiring the name to end at a non-slot character makes the
  // match exact.
  return pattern.replace(/\{([A-Z_0-9]+)(?![A-Z_0-9}])/g, (whole, name) =>
    legal.has(name) ? `{${name}}` : whole
  );
}

/** Rejects any brace that is still unbalanced after repair. */
export function assertBalancedPlaceholders(pattern: string): { ok: boolean; reason?: string } {
  const opens = (pattern.match(/\{/g) ?? []).length;
  const closes = (pattern.match(/\}/g) ?? []).length;
  if (opens !== closes) return { ok: false, reason: `unbalanced placeholder braces (${opens} "{" vs ${closes} "}")` };
  const stray = pattern.replace(PLACEHOLDER, " ").match(/[{}]/);
  if (stray) return { ok: false, reason: "malformed placeholder (stray brace outside a {SLOT})" };
  return { ok: true };
}

export function validateCandidate(pattern: string, ctx: ValidationContext): { ok: boolean; reason?: string; repaired?: string } {
  let trimmed = repairPlaceholders(pattern.trim(), legalSlots(ctx.spec, ctx.action));
  const balanced = assertBalancedPlaceholders(trimmed);
  if (!balanced.ok) return balanced;
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > 120) return { ok: false, reason: "too long (>120 chars) — not a realistic utterance" };
  // Trailing sentence punctuation is REPAIRED, not rejected. The tokenizer
  // strips it anyway, so a trailing "?" carries no information — but rejecting
  // on it threw away 75 otherwise-valid ADD_EXPENSE|CREATE patterns in one run
  // for a single character. Same reasoning as repairPlaceholders: fix what is
  // mechanically fixable, reject only what is semantically wrong.
  trimmed = trimmed.replace(/[.?!]+$/, "").trim();
  if (!trimmed) return { ok: false, reason: "empty after stripping punctuation" };

  // (1) placeholder legality
  const legal = legalSlots(ctx.spec, ctx.action);
  const used = [...trimmed.matchAll(PLACEHOLDER)].map((m) => m[1]);
  for (const slot of used) {
    if (!legal.has(slot)) {
      return { ok: false, reason: `illegal slot {${slot}} — not in ${ctx.spec.intent}'s entities (${[...legal].join(", ") || "none"})` };
    }
  }

  // (2) required entities present (write-style actions only — an ANALYSIS
  // pattern legitimately omits them; the slot engine clarifies at runtime)
  if (["CREATE", "UPDATE"].includes(ctx.action)) {
    for (const req of ctx.spec.required_entities) {
      if (!used.includes(req)) return { ok: false, reason: `missing required entity {${req}} for ${ctx.action}` };
    }
  }

  // (3) skeleton dedup within the bucket
  const key = skeletonKey(trimmed);
  if (!key) return { ok: false, reason: "skeleton is empty after normalization (slots only, no words)" };
  if (ctx.existingKeys.has(key)) return { ok: false, reason: "duplicate skeleton (already in this bucket)" };

  // (4) cross-intent collision
  const owner = ctx.crossIntentKeys.get(key);
  if (owner && owner !== ctx.spec.intent) {
    return { ok: false, reason: `skeleton collides with intent ${owner} — would create conflicting labels` };
  }

  // (5) eval-suite leakage (slot-erased comparison, so any fill of this
  // pattern that reproduces a held-out case is caught)
  if (ctx.evalSuiteKeys.has(key)) return { ok: false, reason: "matches a held-out eval-suite utterance (Tier-2 leakage)" };

  // (7) LITERAL ENTITY VALUES — a pattern must not hardcode a value where a
  // slot belongs ("my food expenses" instead of "my {CATEGORY} expenses").
  // Such a pattern trains the NER head that "food" in that position is NOT an
  // entity, directly degrading extraction. Observed live: 9 of 30 candidates
  // in the second SPENDING_ANALYSIS|COMPARISON run.
  const literal = findLiteralEntityValue(trimmed, ctx.spec);
  if (literal) {
    return { ok: false, reason: `literal "${literal}" should be a {${literalSlotFor(literal)}} placeholder, not baked into the skeleton` };
  }

  // (8) TYPOGRAPHY — non-ASCII lookalikes (U+2011 non-breaking hyphen, smart
  // quotes) tokenize differently from their ASCII forms and would create a
  // skeleton the app can never match at inference.
  const badChar = trimmed.match(/[\u2010-\u2015\u2018\u2019\u201C\u201D\u2026]/);
  if (badChar) return { ok: false, reason: `non-ASCII punctuation ${JSON.stringify(badChar[0])} — use plain ASCII` };

  // (6) ACTION SHAPE — does the pattern actually mean what its taskType says?
  // Rules 1-5 are all structural; without this, a model asked for COMPARISON
  // happily returns "show me my {CATEGORY} spending for {PERIOD}" (a SUMMARY)
  // and every structural check passes. Training that as COMPARISON teaches the
  // taskType head that summary phrasings mean comparison. Observed live:
  // 35 of 45 candidates in the first SPENDING_ANALYSIS|COMPARISON run.
  // ── Rule 13: CASHFLOW risk vs neutral accounting ────────────────────────
  // CASHFLOW_WARNING is about SHORTFALL RISK, not about reporting balances.
  // Without this, "display my account balance on {DATE}" and "summarize my
  // spending for {PERIOD}" were generated under it and it stole those intents'
  // queries at inference (precision 0.50).
  if (ctx.spec.intent === "CASHFLOW_WARNING" && !CASHFLOW_RISK_CUE.test(trimmed)) {
    return { ok: false, reason: "no shortfall/risk language — a neutral balance or spending total belongs to NET_WORTH_CHECK or SPENDING_ANALYSIS. Needs run out / cover / afford / last / short / low / enough / tight" };
  }

  // ── Rule 12: BUDGET vs SPENDING intent boundary ─────────────────────────
  // BUDGET_PLANNING answers "am I within my LIMIT"; SPENDING_ANALYSIS answers
  // "how much did I spend". They share category + period + amount vocabulary,
  // so nothing structural separates them. Measured live on run 8: the hard-case
  // benchmark showed "how much have i spent on travel this month" predicted as
  // BUDGET_PLANNING (0.58) instead of SPENDING_ANALYSIS, and 40 of 49
  // BUDGET|SUMMARY patterns never mentioned a budget at all — they were plain
  // spending queries generated under the wrong intent.
  //
  // ALLOCATION is EXEMPT: "how should I split my income" is inherently a
  // budgeting question even without the word "budget", and ALLOCATION_CUE
  // already identifies it.
  if (ctx.spec.intent === "BUDGET_PLANNING" && ["SUMMARY", "STATUS"].includes(ctx.action) && !BUDGET_REF.test(trimmed)) {
    return { ok: false, reason: "no budget reference — 'how much did I spend' is SPENDING_ANALYSIS. A BUDGET pattern must name the budget/limit/cap/allocation it is measured against" };
  }

  // ── Rule 11: DEBT vs LOAN intent boundary ───────────────────────────────
  // DEBT_FREEDOM_ANALYSIS answers a TRAJECTORY ("when will this be gone");
  // LOAN_ANALYSIS answers STATE ("what is it right now"). They share every
  // noun — loan, EMI, outstanding, balance, lender — so nothing structural
  // separates them. Measured live 2026-07-18: without this rule the generator
  // put "how much do I still owe in total" under DEBT|SUMMARY, and the trained
  // model collapsed LOAN_ANALYSIS to recall 0.03 (precision 1.00) because debt
  // had absorbed its questions.
  if (intentIsDebtTrajectory(ctx.spec.intent) && ["SUMMARY", "ANALYSIS"].includes(ctx.action) && !TRAJECTORY_CUE.test(trimmed)) {
    return { ok: false, reason: "no trajectory cue — a state question ('how much do I owe') is LOAN_ANALYSIS, not DEBT_FREEDOM_ANALYSIS. Needs when/how long/payoff/clear/remaining/debt free" };
  }
  if (ctx.spec.intent === "LOAN_ANALYSIS" && ctx.action === "SUMMARY" && TRAJECTORY_CUE.test(trimmed) && !STATE_CUE.test(trimmed)) {
    return { ok: false, reason: "trajectory cue without a state anchor — that is DEBT_FREEDOM_ANALYSIS, not LOAN_ANALYSIS" };
  }


  // ANALYSIS's global "must ask WHY" cue only applies where ANALYSIS means
  // WHY. Intents with their own meaning are exempt from it.
  const hasOwnMeaning = Boolean(INTENT_ACTION_SEMANTICS[ctx.spec.intent]?.[ctx.action]);
  const shape = hasOwnMeaning && ctx.action === "ANALYSIS"
    ? checkAffordabilityShape(trimmed, ctx.spec.intent)
    : checkActionShape(trimmed, ctx.action);
  if (!shape.ok) return shape;

  // Return the REPAIRED text so callers persist the corrected pattern, not
  // the model's malformed original.
  return { ok: true, repaired: trimmed };
}

/**
 * Prompt for one batch.
 *
 * DELIBERATELY SHORT. The first version enumerated every rule (slot legality,
 * required entities, comparison-role semantics, style guidance) and gpt-oss —
 * a REASONING model — spent its entire token budget deliberating over the
 * constraints and emitted an EMPTY response (14k+ chars of `thinking`, zero
 * output). Verified fix: state the task plainly, show the format by example,
 * and let the five auto-validation rules downstream reject anything wrong.
 * Constraints belong in the validator, not the prompt.
 */
/**
 * Discriminator ("must use one of") + forbidden-sibling ("must not use") words
 * per SPENDING_ANALYSIS sub-task. This REPLACES the earlier idea of forcing an
 * entity token into every utterance — the taskType is separated by its ACTION
 * word, not by the presence of {CATEGORY}/{PERIOD}/{MERCHANT}. Forcing entities
 * distorts the distribution and teaches the NER head to over-extract; the engine
 * already handles entity-less queries with disclosed defaults. Mirrors
 * scripts/spending_conflict_lint.py (the validator gate). Human-readable words,
 * not regexes — this is prompt copy.
 */
const SPENDING_DISCRIMINATORS: Record<string, string[]> = {
  SUMMARY: ["total", "how much", "summary", "report", "combined", "sum up"],
  BREAKDOWN: ["breakdown", "split", "by category", "distribution", "percentage", "pie chart"],
  ROOT_CAUSE: ["why", "what's driving", "reason", "cause", "what led to", "explain"],
  TREND: ["trend", "over time", "month over month", "rising", "falling", "going up or down"],
  COMPARISON: ["vs", "versus", "compare", "difference between", "X or Y", "more than"],
  TOP_SPENDERS: ["top", "biggest", "largest", "most", "main merchant", "who did I pay", "biggest contributors"],
  ANOMALY_DETECTION: ["unusual", "anomaly", "spike", "deviation", "abnormal", "sudden", "out of the ordinary"],
  SUBSCRIPTIONS: ["subscription", "recurring", "sip", "auto-debit", "membership", "renewal", "standing order"],
  AVERAGES: ["average", "avg", "mean", "per day", "per month", "on average", "daily rate"],
};
// The single strongest, most-poisoning signal word(s) of each sub-task — used to
// build the "do NOT use" list for its siblings.
const SPENDING_SIGNAL: Record<string, string[]> = {
  SUMMARY: [],
  BREAKDOWN: ["breakdown", "split", "by category"],
  ROOT_CAUSE: ["why", "what's driving"],
  TREND: ["trend", "over time"],
  COMPARISON: ["vs", "versus", "compare"],
  TOP_SPENDERS: ["top", "biggest", "contributors"],
  ANOMALY_DETECTION: ["unusual", "spike", "anomaly"],
  SUBSCRIPTIONS: ["subscription", "recurring"],
  AVERAGES: ["average", "per day"],
};

function spendingConflictHint(intent: string, action: string): string {
  if (intent !== "SPENDING_ANALYSIS" || !SPENDING_DISCRIMINATORS[action]) return "";
  const must = SPENDING_DISCRIMINATORS[action];
  const forbidden = Object.entries(SPENDING_SIGNAL)
    .filter(([tt]) => tt !== action)
    .flatMap(([, w]) => w);
  const mustLine = action === "SUMMARY"
    ? `\nSUB-TASK RULE: SUMMARY is the plain-total case. It needs NO special action word, but it MUST NOT carry another sub-task's word.`
    : `\nSUB-TASK RULE: every pattern MUST express the ${action} action with one of: ${must.map((w) => `"${w}"`).join(", ")}.`;
  return `${mustLine}
Do NOT use any of these words (they belong to sibling sub-tasks): ${forbidden.map((w) => `"${w}"`).join(", ")}.
Vary entity presence REALISTICALLY: about 60-70% of patterns should include a placeholder like {CATEGORY}/{PERIOD}/{MERCHANT}, and 30-40% should be bare (no placeholder). Do NOT force an entity into every line. Include some Hinglish (Hindi-English) variants.`;
}

function buildPrompt(spec: IntentSpec, action: string, existing: string[], need: number): string {
  const slots = [...legalSlots(spec, action)];
  const slotHelp = slots.length
    ? slots.map((s) => `{${s}}`).join(", ")
    : "(none — write patterns with no placeholders)";
  const examples = (spec.utterance_patterns[action] ?? []).slice(0, 3);
  const required = spec.required_entities;

  const literalWarning = slots.includes("CATEGORY")
    ? `\nNEVER write a real category name (food, groceries, rent, travel, utilities...) — always use {CATEGORY}.`
    : "";
  const comparisonHint = action === "COMPARISON" && slots.includes("PERIOD1")
    ? `\nUse {PERIOD1} and {PERIOD2} for the two periods being compared, e.g. "compare {PERIOD1} vs {PERIOD2}". A few may instead use ONE period with a comparison word, e.g. "am I spending more than {PERIOD2}".`
    : "";
  const requiredHint = required.length && ["CREATE", "UPDATE"].includes(action)
    ? `\nEvery pattern must include ${required.map((r) => `{${r}}`).join(" and ")}.`
    : "";

  const semantics = semanticsFor(spec.intent, action);
  // The generic taskType meaning has now produced wrong-intent patterns three
  // times (AFFORDABILITY, BUDGET, CASHFLOW). Restating the intent's OWN scope
  // next to it keeps a bucket without an explicit override anchored to what
  // the intent is actually for, instead of to the generic label meaning.
  const scopeReminder = `Every pattern must be a question about: ${spec.description}`;

  return `Write ${need} different ways a user might say this to a personal-finance app.

TOPIC: ${spec.description}
WHAT THE USER WANTS: ${semantics}

EVERY pattern must clearly ${semantics}.
${scopeReminder}
Do not write patterns that belong to a different intent.

Use these placeholders instead of real values: ${slotHelp}${comparisonHint}${requiredHint}${literalWarning}${spendingConflictHint(spec.intent, action)}

Format examples:
${(examples.length ? examples : ["<no examples yet>"]).map((p) => `- ${p}`).join("\n")}

Rules: vary the wording and sentence shape a lot. No trailing punctuation. Do not repeat these:
${existing.slice(0, 25).map((p) => `- ${p}`).join("\n") || "- (none)"}

Return JSON: {"patterns": ["...", "..."]}`;
}

/** Extracts a string[] from whatever envelope a model wrapped it in. */
function coercePatternArray(raw: string): string[] {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  const parsed = JSON.parse(start > 0 ? cleaned.slice(start) : cleaned);
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed.patterns ?? parsed.results ?? parsed.utterances ?? Object.values(parsed).find(Array.isArray) ?? []);
  return (arr as unknown[]).filter((x): x is string => typeof x === "string");
}

async function callOllama(prompt: string): Promise<string[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: "json", options: { temperature: 0.9, num_predict: 8192 } }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { response: string };
  return coercePatternArray(json.response);
}

async function callOpenAi(prompt: string): Promise<string[]> {
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
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return coercePatternArray(json.choices[0].message.content);
}

async function callLlm(prompt: string, provider: Provider): Promise<string[]> {
  return provider === "openai" ? callOpenAi(prompt) : callOllama(prompt);
}

function loadExistingPatterns(): Map<string, Set<string>> {
  const byBucket = new Map<string, Set<string>>();
  if (!fs.existsSync(DATASET)) return byBucket;
  for (const line of fs.readFileSync(DATASET, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const bucket = `${r.intent}|${r.taskType}`;
      if (!byBucket.has(bucket)) byBucket.set(bucket, new Set());
      if (r.sourcePattern) byBucket.get(bucket)!.add(r.sourcePattern);
    } catch { /* skip malformed line */ }
  }
  return byBucket;
}

/**
 * Held-out utterances, keyed the same way a PATTERN is keyed.
 *
 * Eval-suite rows carry FILLED entity values ("...last month"), whereas a
 * candidate pattern carries a slot ("...{PERIOD}"). Comparing them directly
 * never matches, so each suite row's known entity VALUES are erased from its
 * utterance before keying — making the comparison slot-for-slot. Suite rows
 * whose entities aren't enumerated still contribute their raw key, which
 * catches slot-free patterns (e.g. the T9 negatives).
 */
export function evalSuiteKeyForUtterance(utterance: string, entityValues: string[]): string {
  let text = utterance;
  // Longest-first so "last two months" is erased before "months".
  for (const v of [...entityValues].sort((a, b) => b.length - a.length)) {
    if (!v) continue;
    text = text.replace(new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return skeletonKey(text);
}

function loadEvalSuiteKeys(): Set<string> {
  const keys = new Set<string>();
  for (const p of EVAL_SUITES) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (!row.utterance) continue;
        const utterance = String(row.utterance);
        const values = (row.expected?.entities ?? []).map((e: any) => String(e.value ?? ""));
        keys.add(skeletonKey(utterance));                       // slot-free match
        if (values.length) keys.add(evalSuiteKeyForUtterance(utterance, values)); // slotted match
      } catch { /* skip */ }
    }
  }
  return keys;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const intentFilter = args.includes("--intent") ? args[args.indexOf("--intent") + 1] : null;
  // --action narrows to ONE taskType so a single bucket can be trialled before
  // committing tokens to all 60. --provider swaps the backend; --append keeps
  // an existing candidate file so buckets can be run incrementally.
  const actionFilter = args.includes("--action") ? args[args.indexOf("--action") + 1] : null;
  const provider: Provider = (args.includes("--provider") ? args[args.indexOf("--provider") + 1] : "ollama") as Provider;
  const append = args.includes("--append");
  if (provider !== "ollama" && provider !== "openai") {
    console.error(`Unknown --provider "${provider}" (expected: ollama | openai)`); process.exit(1);
  }
  const modelName = provider === "openai" ? OPENAI_MODEL : OLLAMA_MODEL;
  if (!dryRun) console.log(`Provider: ${provider} | model: ${modelName}${actionFilter ? ` | action: ${actionFilter}` : ""}`);

  const specs = loadIntentSpecs().filter((s) => (intentFilter ? s.intent === intentFilter : true));
  const existingByBucket = loadExistingPatterns();
  const evalSuiteKeys = loadEvalSuiteKeys();

  // Cross-intent index over every existing pattern in every spec.
  const crossIntentKeys = new Map<string, string>();
  for (const spec of loadIntentSpecs()) {
    for (const patterns of Object.values(spec.utterance_patterns ?? {})) {
      for (const p of patterns as string[]) crossIntentKeys.set(skeletonKey(p), spec.intent);
    }
  }

  const candidates: CandidatePattern[] = [];
  const summary: { bucket: string; had: number; need: number; accepted: number; rejected: number }[] = [];

  for (const spec of specs) {
    for (const action of spec.supported_actions) {
      if (action === "NONE") continue; // UNKNOWN: free-form negatives, not slot patterns
      if (actionFilter && action !== actionFilter) continue;
      const bucket = `${spec.intent}|${action}`;
      const existing = [...(existingByBucket.get(bucket) ?? new Set<string>())];
      const need = TARGET_PATTERNS_PER_BUCKET - existing.length;
      if (need <= 0) continue;

      const prompt = buildPrompt(spec, action, existing, BATCH_SIZE);

      if (dryRun) {
        console.log(`\n${"=".repeat(70)}\n${bucket}  (have ${existing.length}, need ${need})\n${"=".repeat(70)}`);
        console.log(prompt);
        summary.push({ bucket, had: existing.length, need, accepted: 0, rejected: 0 });
        continue;
      }

      const ctx: ValidationContext = {
        spec, action,
        existingKeys: new Set(existing.map(skeletonKey)),
        crossIntentKeys,
        evalSuiteKeys,
      };

      // Batched requests: asking a reasoning model for 50+ items in one shot
      // makes it deliberate until the token budget is gone and return NOTHING.
      // Small batches keep each response short and let partial progress stand.
      let accepted = 0, rejected = 0;
      for (let batch = 0; batch < MAX_BATCHES && accepted < need; batch++) {
        const batchPrompt = buildPrompt(spec, action, [...ctx.existingKeys].length ? existing.concat(
          candidates.filter((c) => c.intent === spec.intent && c.taskType === action && c.status === "approved").map((c) => c.pattern)
        ) : existing, BATCH_SIZE);

        let raw: string[] = [];
        try {
          raw = await callLlm(batchPrompt, provider);
        } catch (e) {
          // A truncated/malformed JSON response is transient — the next batch
          // usually succeeds. Aborting the bucket on the first bad response
          // threw away all remaining budget, so failures are skipped, not fatal.
          console.warn(`  ! ${bucket} batch ${batch + 1}: ${(e as Error).message} — skipping batch`);
          continue;
        }
        if (raw.length === 0) {
          console.warn(`  ! ${bucket} batch ${batch + 1}: model returned no patterns (reasoning models can exhaust their budget before emitting — try a smaller BATCH_SIZE)`);
          continue;
        }

        for (const p of raw) {
          const verdict = validateCandidate(p, ctx);
          if (verdict.ok) {
            const stored = verdict.repaired ?? p.trim();
            ctx.existingKeys.add(skeletonKey(stored));
            crossIntentKeys.set(skeletonKey(stored), spec.intent);
            candidates.push({ intent: spec.intent, taskType: action, pattern: verdict.repaired ?? p.trim(), status: "approved" });
            accepted++;
          } else {
            candidates.push({ intent: spec.intent, taskType: action, pattern: p.trim(), status: "rejected", reason: verdict.reason });
            rejected++;
          }
        }
        console.log(`    batch ${batch + 1}: +${raw.length} returned, ${accepted}/${need} accepted so far`);
      }
      console.log(`  ${accepted >= need ? "✓" : "~"} ${bucket}: +${accepted} accepted, ${rejected} rejected (needed ${need})`);
      summary.push({ bucket, had: existing.length, need, accepted, rejected });
    }
  }

  if (dryRun) {
    console.log(`\n${summary.length} bucket(s) below the ${TARGET_PATTERNS_PER_BUCKET}-pattern floor. Dry run — no LLM calls made.`);
    return;
  }

  // --append merges into an existing candidate file so buckets can be
  // generated incrementally (trial one bucket, review, then run the rest)
  // without losing prior candidates.
  let allCandidates = candidates;
  let allSummary = summary;
  if (append && fs.existsSync(OUTPUT)) {
    const prev = JSON.parse(fs.readFileSync(OUTPUT, "utf-8")) as { candidates: CandidatePattern[]; summary: typeof summary };
    const seen = new Set(candidates.map((c) => `${c.intent}|${c.taskType}|${c.pattern}`));
    allCandidates = [...prev.candidates.filter((c) => !seen.has(`${c.intent}|${c.taskType}|${c.pattern}`)), ...candidates];
    const bucketsNow = new Set(summary.map((x) => x.bucket));
    allSummary = [...prev.summary.filter((x) => !bucketsNow.has(x.bucket)), ...summary];
  }
  fs.writeFileSync(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), provider, model: modelName, target: TARGET_PATTERNS_PER_BUCKET, summary: allSummary, candidates: allCandidates }, null, 2));
  const acc = allCandidates.filter((c) => c.status === "approved").length;
  console.log(`\n📝 ${acc} approved / ${allCandidates.length} total -> ${path.relative(process.cwd(), OUTPUT)}`);
  console.log(`   REVIEW the approved patterns, delete any that read unnaturally, then run: npm run patterns:merge`);
}

// Auto-run ONLY when this module is the CLI entrypoint. A substring match on
// "expandPatterns" also matches expandPatterns.test.js, which made importing
// the module from its own test suite fire main() and hang on the LLM call.
const invokedAs = process.argv[1] ? path.basename(process.argv[1]) : "";
if (invokedAs === "expandPatterns.ts" || invokedAs === "expandPatterns.js") {
  main();
}
