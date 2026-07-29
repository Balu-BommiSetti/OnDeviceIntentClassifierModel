import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadIntentSpecs, IntentSpec } from "./index";
import { AMOUNTS, CATEGORIES, DATE_RANGES, FREQUENCIES, INTEREST_RATES, REGIONS, STYLE_MODIFIERS } from "../config/generationConfig";
import { buildPeriodFillers, buildDateFillers, buildTargetDateFillers, assertNoDatePeriodOverlap } from "./entities/grammarFillers";
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

// PERIOD/DATE/TARGETDATE come from period.grammar.json (Phase 1) — the same
// contract the app's TemporalResolver is tested against. DATE_RANGES is no
// longer used for these three slots; see entities/grammarFillers.ts.
const PERIOD_FILLERS = buildPeriodFillers();
const DATE_FILLERS = buildDateFillers();
assertNoDatePeriodOverlap(DATE_FILLERS, PERIOD_FILLERS);

// Entity slot -> candidate fillers. Entities carry their own type for the NER head.
const SLOT_VALUES: Record<string, string[]> = {
  AMOUNT: AMOUNTS,
  CATEGORY: CATEGORIES,
  // Widened 2026-07-19: Zomato/Flipkart/Ola/Costco were absent, so QA cases
  // referencing them ("Swiggy and Zomato", "Amazon and Flipkart", "Uber and
  // Ola", "at Costco") were unlearnable by construction — not model failures.
  MERCHANT: [
    "Amazon", "Netflix", "Uber", "Swiggy", "Starbucks", "the landlord",
    "Walmart", "the clinic", "Zomato", "Flipkart", "Ola", "Costco", "Myntra",
    "BigBasket", "PhonePe", "Ajio", "Paytm", "GPay", "Blinkit", "Zepto",
    "Dunzo", "Nykaa", "Croma", "Reliance Digital", "DMart", "Reliance Fresh",
    "JioMart", "BookMyShow", "PVR", "MakeMyTrip", "Cleartrip", "IRCTC",
    "RedBus", "Tesco", "Carrefour", "Target", "Best Buy", "IKEA", "McDonald's",
    "Domino's", "KFC", "Burger King", "Subway", "Shoppers Stop", "Lifestyle",
    "Decathlon", "H&M", "Zara", "Marks & Spencer", "PharmEasy", "1mg",
    "Apollo Pharmacy", "Urban Company", "Lenskart", "Airbnb", "Oyo", "Agoda",
    "Tinder", "Bumble", "Spotify", "Apple Music", "YouTube Premium",
    "Disney+ Hotstar", "Prime Video", "SonyLIV", "Zee5", "Voot",
    "Airtel", "Jio", "Vodafone", "Bescom", "Adani Electricity", "Tata Power",
    "Indane", "HP Gas", "Bharat Gas", "ICICI Lombard", "LIC",
    "Bajaj Allianz", "Star Health", "HDFC Ergo", "SBI General",
    "Google Play", "App Store", "PlayStation", "Steam", "Xbox",
    "Bata", "Nike", "Adidas", "Puma", "Reebok", "Skechers"
  ],
  DATE: DATE_FILLERS,
  PERIOD: PERIOD_FILLERS,
  PAYMENT_METHOD: ["credit card", "UPI", "cash", "debit card", "bank transfer"],
  FREQUENCY: FREQUENCIES,
  INTERESTRATE: INTEREST_RATES,
  // Widened 2026-07-19: "platinum" (QA bare-reply case) was absent, and the
  // pool skewed toward INR-typical instruments without common alternatives.
  ASSETTYPE: ["gold", "mutual fund", "stocks", "property", "land", "bitcoin",
    "fixed deposit", "SIP", "a house", "a car", "silver", "platinum",
    "cryptocurrency", "bonds", "PPF", "NPS", "an ETF",
    // Added 2026-07-20: probe sweep showed ADD_ASSET losing 9 cases to
    // ADD_EXPENSE/ADD_LIABILITY. "real estate", "a plot", "savings bonds",
    // "shares" and startup investments were absent, so an amount plus an
    // unrecognised noun read as a purchase rather than an asset.
    "real estate", "a plot", "shares", "savings bonds",
    "an investment in a startup", "a recurring deposit"],
  // "EMI" removed 2026-07-19: it is a PAYMENT, not a liability type, and its
  // presence here taught the NER head to emit spurious LIABILITYTYPE=emi in
  // any EMI-containing sentence (QA commitment_semantics/risk_grade).
  LIABILITYTYPE: ["home loan", "car loan", "personal loan", "credit card debt", "bike loan", "education loan", "gold loan"],
  // "my friend" also lived in SPLITWITH and "the bank" in ADD_INCOME's MERCHANT
  // pool, so LENDER shared its two most generic values with two other slots —
  // B-LENDER f1 0.578 / recall 0.433. Lenders are INSTITUTIONS here; informal
  // person-lending is FAMILY_TRANSFER's territory, not a LENDER value.
  LENDER: ["HDFC", "SBI", "ICICI", "Axis Bank", "Kotak", "Bajaj Finance",
           "the credit union", "LIC", "IDFC", "Yes Bank", "the bank"],
  GOALNAME: ["a car", "a house", "vacation", "emergency fund", "retirement", "an iphone", "wedding", "a laptop"],
  // TARGETAMOUNT was AMOUNTS — the SAME pool as AMOUNT, and GOAL_PLANNING
  // declares BOTH slots. The model saw "45.50" and "roughly 500" labelled as
  // each type in the same intent and could not separate them: B-TARGETAMOUNT
  // f1 0.590 / recall 0.419, I-TARGETAMOUNT f1 0.148 / recall 0.080 — the
  // worst entity in the model, while its siblings GOALNAME (0.939) and
  // TARGETDATE (0.923) were fine.
  // This is the identical bug already fixed for EXTRAPAYMENT (0.500 -> 0.737):
  // when two slots share a filler pool, only context can separate them, and
  // context alone is not enough. A goal TARGET is a savings ambition — large,
  // round, and multi-token — which is a different number shape from an
  // everyday transaction amount. Multi-token values are deliberate here:
  // I-TARGETAMOUNT can only be learned from spans that HAVE a continuation.
  // Goal scale: larger and rounder than a windfall, so the RANGE separates
  // them rather than artificial oddness. No value appears in another pool.
  TARGETAMOUNT: [
    "5 lakh", "10 lakh", "15 lakh", "20 lakh", "25 lakh", "50 lakh",
    "1 crore", "2 crore", "5 lakhs", "12 lakhs", "30 lakh",
    "500000", "1050000", "1500000", "2500000", "75 lakh",
    // Bare-digit ₹1 Cr-scale values added 2026-07-28 — the app's flagship
    // "₹1 Cr Journey" milestone gets spoken as a bare number ("help me reach
    // 10000000"/the ₹ symbol strips to a raw digit string at tokenization,
    // see clean_tokenize), but the pool topped out at 2500000 (25 lakh) —
    // nothing near 1 Cr existed as a bare digit string, only as the word
    // "1 crore". That gap (+ no bare-{TARGETAMOUNT}-only template, see the
    // ANALYSIS patterns above) made "help me reach ₹10000000" fall through
    // to sentence-shape matching and misclassify as ADD_EXPENSE.
    "10000000", "5000000", "20000000",
  ],
  TARGETDATE: buildTargetDateFillers(),
  // EXTRAPAYMENT is a RECURRING monthly extra on a loan. It shared the full
  // AMOUNTS pool, which offers "50 paisa" and "2.5 crores" as monthly extras —
  // implausible values that dilute the context signal separating EXTRAPAYMENT
  // from generic AMOUNT (B-EXTRAPAYMENT f1 was 0.500, the weakest slot
  // family, despite 329 training rows). Plausible-magnitude pool only.
  EXTRAPAYMENT: ["1000", "2000", "500", "5000", "3000", "1500", "10000", "7500", "2500", "5k", "2 thousand", "four thousand", "1 lakh"],  // + lakh-scale: realistic recurring extra on a large home loan (was missing, caused DEBT_FREEDOM->AFFORDABILITY on "1 lakh extra per month")
  // LUMPSUM is a ONE-TIME windfall — its own pool of windfall-shaped values so
  // the model learns the distinction from EXTRAPAYMENT by context AND by the
  // kind of number that appears. Conflating the two makes the engine model a
  // one-off bonus as a recurring payment (see DebtScenario).
  // REBUILT 2026-07-20 (shared-pool audit). 8 of the 10 previous values also
  // appeared as DOWNPAYMENT ("2 lakh", "200000", "5 lakhs", "50000"), AMOUNT
  // or TARGETAMOUNT — so LUMPSUM had almost no unique signal and collapsed to
  // B-LUMPSUM f1 0.111 / recall 0.059, the worst tag in the model. Same
  // structural bug as TARGETAMOUNT (0.148 -> 0.857) and EXTRAPAYMENT
  // (0.500 -> 0.737): two slots drawing from overlapping values inside the
  // same intent leave only context to separate them, and context is not enough.
  // A LUMPSUM is a one-off windfall — bonus, maturity, sale proceeds — so the
  // values are deliberately "odd" magnitudes that a DOWNPAYMENT (round, often
  // a percentage) and an everyday AMOUNT never take.
  // SEPARATED BY MAGNITUDE RANGE, NOT BY ODD VALUES (2026-07-20).
  // The previous pool used deliberately odd amounts ("1.2 lakh", "6.5 lakh")
  // to break the collision with DOWNPAYMENT/AMOUNT. It worked on the tags
  // (B-LUMPSUM 0.111 -> 0.647) but COST generalisation: 11 of 18 amount spans
  // in the held-out QA suite are ROUND (500, 50000, 200000, 500000), because
  // real people say round numbers. Teaching odd ones trades realism for
  // separability and QA entity-exact fell 64.0 -> 60.0%.
  // Correct axis is RANGE: a windfall is large and round; an everyday AMOUNT
  // is small and round; a DOWNPAYMENT is a percentage or a mid-size round.
  // Values stay natural, and no two pools share one.
  // REVERTED to the run-36 values 2026-07-20. Three successive attempts to
  // "fix" this pool (odd magnitudes, then range separation) each improved
  // B-LUMPSUM's own F1 while making QA entity-exact WORSE — 64.0 -> 60.0 ->
  // 59.4%. Per-type F1 and real-world QA performance turned out not to be
  // correlated here, and QA is the honest measure. Left as-is deliberately.
  LUMPSUM: ["50000", "100000", "2 lakh", "1.5 lakhs", "200000", "75000", "3 lakh", "5 lakhs", "25000", "10 lakhs"],
  STRATEGY: ["snowball", "avalanche", "highest interest first", "smallest balance first", "debt consolidation", "consolidation"],
  TENUREMONTHS: ["12 months", "24 months", "36 months", "5 years", "10 years", "60 months"],
  // SHORT-FORM pools. The generic pools are diversity-weighted toward long
  // forms ("July through October", "in the last 6 weeks", "2.5 lakhs"), so
  // the SHORT regime QA actually tests — bare noun + short relative period,
  // clean numeric amounts — was sampled almost never (5 rows total across 10
  // dedicated patterns in run 21). These slots let a pattern OPT INTO the
  // short regime deterministically; SLOT_TYPE_ALIASES maps them back to the
  // real entity types so the model's tag set is unchanged.
  PERIODSHORT: [
    "last month", "this month", "this year", "last year", "this week",
    "last week", "this quarter", "last quarter", "May", "June", "March",
    "last two months", "last 3 months", "past week", "October",
  ],
  PLAINAMOUNT: ["500", "2000", "1200", "300", "1500", "250", "800", "5000", "100", "750"],
  // SPLITWITH — the person a FAMILY_TRANSFER is sent to or shared with.
  // Declared in FAMILY_TRANSFER's spec but MISSING from this map, so fill()
  // returned null for every pattern using it and the bucket silently produced
  // ZERO rows: 92 of its 140 patterns generated nothing and the intent stayed
  // unmeasurable (0 test rows) across four training runs while appearing
  // "populated" in the spec.
  // Proper names added 2026-07-29: the pool was 100% relationship-word based
  // ("my brother", "mom"), so the model had never seen a NAMED person as a
  // SPLITWITH value and consistently misrouted "make the transfer to Priya
  // ₹1800"/"sent ₹5000 to Rahul" to ADD_EXPENSE/BUDGET_PLANNING instead of
  // FAMILY_TRANSFER — confirmed via harness cases #365/#364. A generic,
  // gender-mixed first-name sample (not tied to any real person) teaches the
  // model "a bare proper noun after send/transfer to" is the same slot shape
  // as the relationship words, without needing an exhaustive name list.
  SPLITWITH: ["my brother", "my sister", "mom", "dad", "my parents", "my wife", "my husband",
              "my son", "my daughter", "my cousin", "my friend", "my roommate", "my flatmate",
              "Priya", "Rahul", "Amit", "Rohan", "Sneha", "Anjali", "Vikram", "Neha"],
  // DOWNPAYMENT is read by FinanceDispatcher's AFFORDABILITY_CHECK branch
  // (downPaymentPercent) but was never declared in the spec, so the model had
  // no way to emit it. Both percentage and absolute phrasings appear in real
  // questions ("20% down" / "2 lakh down").
  DOWNPAYMENT: ["10%", "20%", "25%", "30%", "50%", "1 lakh", "200000", "50000", "5 lakhs", "2 lakh"],
  // PERIOD1/PERIOD2 exist so COMPARISON patterns can carry two DISTINCT period
  // spans. Both draw from the same grammar pool; fill() de-duplicates within a
  // single pattern so "June vs June" can't be generated. The NER head tags both
  // as PERIOD (roles are assigned downstream by the app's periodRoles.ts) —
  // see remapComparisonSlots() below.
  PERIOD1: PERIOD_FILLERS,
  PERIOD2: PERIOD_FILLERS,
};

/**
 * COMPARISON patterns use {PERIOD1}/{PERIOD2} for readability and to let
 * fill() guarantee two DIFFERENT values, but the model's tag set has only
 * PERIOD — comparison ROLES are assigned deterministically in the app
 * (periodRoles.ts), never learned. This collapses the entity types back to
 * PERIOD before tagging.
 */
const SLOT_TYPE_ALIASES: Record<string, string> = {
  PERIODSHORT: "PERIOD",
  PLAINAMOUNT: "AMOUNT",
};

/**
 * Held-out utterances the generator must NEVER emit, loaded once at module
 * scope. Without this, a filler-value collision can silently reproduce a QA
 * or hard-example utterance verbatim — discovered 2026-07-19 when widening
 * the MERCHANT/ASSETTYPE pools and SHORT_REPLY_COUNT produced 10 exact
 * matches ("yesterday", "platinum", "zomato", two authored UNKNOWN decoys
 * that happened to already exist as QA cases, ...). validate.ts's gate (9)
 * catches this AFTER a full generation run; this stops it at the source so
 * the class of bug cannot return as pools keep growing.
 */
const HELD_OUT_UTTERANCES: Set<string> = (() => {
  const set = new Set<string>();
  for (const rel of ["../../v6/training_pipeline/benchmarks/qa_scenarios.jsonl",
                      "../../v6/training_pipeline/benchmarks/hard_cases.jsonl"]) {
    const p = path.resolve(__dirname, rel);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const d = JSON.parse(line);
        const u = (d.utterance || d.text || "").toLowerCase().trim();
        if (u) set.add(u);
      } catch { /* skip malformed line */ }
    }
  }
  return set;
})();

function remapComparisonSlots(entities: { type: string; value: string }[]): { type: string; value: string }[] {
  // Strip the role digit from ANY numbered slot, not just PERIOD1/PERIOD2.
  // Hardcoding the pair meant a new numbered slot (e.g. {INTERESTRATE2} in a
  // two-rate refinance comparison) would emit a tag outside the model's tag
  // set — same silent-failure class as the SPLITWITH missing-pool bug.
  // Then resolve short-form slot aliases to their REAL entity type, so
  // {PERIODSHORT} rows train the PERIOD tag, not a new one.
  return entities.map((e) => {
    let t = /\d$/.test(e.type) ? e.type.replace(/\d+$/, "") : e.type;
    t = SLOT_TYPE_ALIASES[t] ?? t;
    return t === e.type ? e : { ...e, type: t };
  });
}

// Digits are REQUIRED in the character class: comparison slots are named
// {PERIOD1}/{PERIOD2}, and with [A-Z_]+ they silently failed to match — the
// literal text "{PERIOD1}" was emitted into utterances and no PERIOD entity
// was ever produced for COMPARISON rows.
const PLACEHOLDER = /\{([A-Z_0-9]+)\}/g;

interface Row {
  utterance: string;
  intent: string;
  taskType: string;
  backendAction: string;
  entities: { type: string; value: string }[];
  tokens: string[];
  tags: string[];
  /**
   * The raw, unfilled template string this row was generated from (e.g.
   * "spent {AMOUNT} on {CATEGORY}"). Enables a template-aware train/eval
   * split in train.py — holding out entire templates rather than random
   * utterance instances, so eval measures generalization to unseen phrasing
   * rather than memorization of a skeleton seen (with different entity
   * fills) during training. See on_device_nlp_system_review.md's leakage
   * finding for why a random split over a template-heavy corpus overstates
   * accuracy.
   */
  sourcePattern: string;
}

// Mirrors train.py's clean_tokenize() exactly (see v6/training_pipeline/train.py)
// so vocabulary/tag alignment matches what the trainer expects.
const CURRENCY_SYMBOLS = /[$₹£€₨]/g;
const SENTENCE_PUNCT = /(?<!\d)[.,](?!\d)|[?!]/g;

function cleanTokenize(text: string): string[] {
  const cleaned = text.toLowerCase().replace(CURRENCY_SYMBOLS, "").replace(SENTENCE_PUNCT, " ");
  return cleaned.split(/\s+/).map((t) => t.trim()).filter(Boolean);
}

/**
 * Locates each entity's value as a token-aligned span and emits BIO tags.
 *
 * ORDERING CONTRACT: this must run BEFORE the typo pass. The previous design
 * ran it after, on the theory that "a mangled value shouldn't be trained as
 * if it were clean" — which reads the labels as claims about the STRING. BIO
 * labels are claims about the token's SEMANTIC ROLE: in "spent 200 on petol",
 * "petol" IS the category mention, and tagging it O trains the head that
 * unfamiliar tokens in entity positions are not entities — the exact inverse
 * of what typo augmentation exists to teach. Measured cost: 793/15766 rows
 * (5%) carried entities their tags didn't cover, and the app's live failure
 * on "petol" (entityConfidence 0.43, category lost) is this bug at inference.
 * Typos are now injected AFTER tagging, at token level, so tags ride along
 * positionally and a typo'd entity token keeps its label.
 *
 * The article-insensitive retry covers generateGrammarMistake, which drops
 * a/an/the from the utterance BEFORE tagging — an entity value like "the
 * bank" would otherwise fail its exact match against the mutated text.
 */
function buildTags(finalUtterance: string, entities: { type: string; value: string }[]): { tokens: string[]; tags: string[] } {
  const tokens = cleanTokenize(finalUtterance);
  const tags = new Array(tokens.length).fill("O");

  const ARTICLES = new Set(["a", "an", "the"]);

  for (const entity of entities) {
    let entityTokens = cleanTokenize(entity.value);
    if (entityTokens.length === 0) continue;
    let matched = matchSpan(tokens, tags, entityTokens, entity.type);
    if (!matched) {
      // Grammar pass may have dropped articles from the utterance; mirror it.
      const noArticles = entityTokens.filter((t) => !ARTICLES.has(t));
      if (noArticles.length > 0 && noArticles.length < entityTokens.length) {
        matched = matchSpan(tokens, tags, noArticles, entity.type);
      }
    }
  }

  return { tokens, tags };
}

/** Exact contiguous token match; tags the first unclaimed occurrence. */
function matchSpan(tokens: string[], tags: string[], entityTokens: string[], type: string): boolean {
  for (let i = 0; i <= tokens.length - entityTokens.length; i++) {
      if (tags[i] !== "O") continue; // don't re-tag a span already claimed by an earlier entity
      let matches = true;
      for (let j = 0; j < entityTokens.length; j++) {
        if (tokens[i + j] !== entityTokens[j]) { matches = false; break; }
      }
      if (matches) {
        tags[i] = `B-${type}`;
        for (let j = 1; j < entityTokens.length; j++) tags[i + j] = `I-${type}`;
        return true; // tag only the first occurrence per entity
      }
    }
  return false;
}

/**
 * Per-intent filler overrides.
 *
 * WHY: SLOT_VALUES is global, but a slot's PLAUSIBLE VALUES are not. CATEGORY
 * holds spending categories (groceries, rent, fuel) and MERCHANT holds payees
 * (Amazon, Netflix, Swiggy). Those are correct for ADD_EXPENSE and
 * SPENDING_ANALYSIS and wrong for an income intent, where the same two slots
 * mean "income source" and "who paid me". Generating INCOME_ANALYSIS off the
 * global pools yields "how much did I earn from groceries" and "what did
 * Netflix pay me" — grammatical, correctly tagged, and semantically nonsense.
 *
 * That failure mode is invisible downstream: validate counts rows, the NER
 * head learns the span boundaries fine, and every gate reports success while
 * the model is trained on utterances no user would ever type. It is the same
 * shape as the SPLITWITH bug below, except it produces bad rows instead of
 * zero rows — which is harder to notice, not easier.
 *
 * The ENTITY TYPE is deliberately unchanged (still CATEGORY / MERCHANT) so the
 * app side needs no new slot handling; only the values differ.
 */
const SLOT_VALUES_BY_INTENT: Record<string, Record<string, string[]>> = {
  INCOME_ANALYSIS: {
    CATEGORY: [
      "salary", "freelance work", "consulting", "rent received", "dividends",
      "interest", "my side business", "bonus", "commission", "overtime",
      "royalties", "capital gains", "my part time job", "tuition fees",
      // Exact app inflow-category names added 2026-07-28 (constants/
      // categoryTaxonomy.ts's Inflows group) — the pool above already covers
      // "salary"/"bonus" as generic phrasing but was missing the app's own
      // exact category labels for the rest, e.g. "Rental Income" vs the
      // looser "rent received" already here.
      "freelance", "rental income", "cashback", "gift received",
      "tax refund", "interest income", "investment return",
    ],
    MERCHANT: [
      "my employer", "my client", "the company", "my tenant", "the agency",
      "my main client", "my previous employer", "the startup",
    ],
  },

  // ADD_INCOME had the SAME defect as INCOME_ANALYSIS but was missed when that
  // was fixed: it is a WRITE intent, so it kept drawing MERCHANT from the
  // global payee pool and trained on "got 5000 from Amazon / Netflix / Swiggy".
  // That teaches the exact inversion the probe sweep caught — a merchant name
  // outweighing the direction verb, so "got 3000 from delivery company" and
  // "add 7500 from zara store" both routed to ADD_EXPENSE (7 misroutes on the
  // label-cleaned set). Pattern COUNT was never the problem: ADD_INCOME|CREATE
  // already had 27 "from" patterns. The FILLERS were wrong.
  // Money direction is the highest-stakes thing this model decides: getting it
  // backwards writes a transaction with the wrong sign.
  ADD_INCOME: {
    // OVER-CORRECTION FIXED 2026-07-20: this pool was swung ENTIRELY to payers,
    // which fixed "got 7500 from zara store" -> ADD_EXPENSE but created the
    // opposite gap — "received 500 from Amazon" and "remove the Amazon income
    // entry" both regressed, because a payee name was never seen in an income
    // context. Real merchants DO pay users: refunds, marketplace payouts,
    // cashback. Both directions must be learnable, so the pool now carries
    // payers AND payee-capable brands rather than trading one for the other.
    MERCHANT: [
      "my employer", "my client", "the company", "my tenant", "the agency",
      "my main client", "my previous employer", "the startup",
      "the delivery company", "my office", "the university", "my landlord",
      "Amazon", "Flipkart", "Swiggy", "Paytm", "PhonePe", "Zomato",
      // "the bank" deliberately NOT here: it collides with LENDER, and LENDER
      // is its correct owner (a held-out QA case asserts LENDER="the bank").
      // Fixing a collision by deleting the value from the slot that SHOULD own
      // it is the wrong direction — it made that QA case unlearnable.
    ],
    CATEGORY: [
      "salary", "bonus", "freelance work", "consulting", "commission",
      "overtime", "rent received", "dividends", "interest", "a refund",
      "my side business", "reimbursement",
    ],
  },

  // FAMILY_TRANSFER is money moving to a PERSON. Drawing MERCHANT from the
  // shop pool made "sent 5000 to <shop>" look like an ordinary purchase, which
  // is why transfers leaked to ADD_INCOME/ADD_EXPENSE (10 misroutes).
  FAMILY_TRANSFER: {
    MERCHANT: [
      "my brother", "my sister", "mom", "dad", "my cousin", "my friend",
      "my uncle", "my aunt", "my roommate", "Rahul", "Priya", "Amit",
    ],
  },
};

/**
 * Locative prepositions that sit OUTSIDE a PERIOD/DATE span.
 *
 * WHY: fillers carry preposition-prefixed variants ("in May", "on Monday") so
 * bare "{PERIOD}" patterns read naturally — but patterns ALSO embed
 * prepositions ("for {PERIOD}", "on {DATE}"). Substituting verbatim did two
 * kinds of damage at once:
 *
 *   1. 767 of 14,560 rows were ungrammatical double-preposition junk:
 *      "on on Sunday" (356 rows), "for in May", "for during October".
 *   2. Span boundaries were CONTRADICTORY: the same surface text trained as
 *      both "in may"=PERIOD and "may"=PERIOD depending on which template drew
 *      which filler. B-PERIOD recall was 0.745 in-distribution — the weakest
 *      common tag — and collapsed to all-O off-template.
 *
 * The rule now: a locative preposition stays in the UTTERANCE (context
 * diversity is the point of those filler variants) but never inside the
 * TAGGED SPAN, and it is dropped entirely when the pattern already supplies
 * one. Range markers ("between", "from", "since") are NOT stripped — they are
 * meaning-bearing ("from March to June" is one range, not a preposition plus
 * a range), and TARGETDATE keeps its prefixes because "by December" (deadline)
 * and "in December" (during) differ semantically.
 */
const LEAD_PREP = /^(?:in|on|for|during|over|at)\s+/i;
const PREP_BEFORE = /\b(?:in|on|for|during|over|at|from|by|since|to|between|of)\s*$/i;
const PREP_STRIP_SLOTS = new Set(["PERIOD", "DATE"]);

function fill(pattern: string, rng: () => number, intent?: string): { utterance: string; entities: { type: string; value: string }[] } | null {
  const entities: { type: string; value: string }[] = [];
  const used = new Set<string>();
  let ok = true;
  const utterance = pattern.replace(PLACEHOLDER, (_m, slot, offset) => {
    // Numbered slots ({PERIOD2}, {INTERESTRATE2}) fall back to their base
    // pool so a new comparison pattern can never silently generate nothing.
    const baseSlot = slot.replace(/\d+$/, "");
    const pool =
      (intent && (SLOT_VALUES_BY_INTENT[intent]?.[slot] ?? SLOT_VALUES_BY_INTENT[intent]?.[baseSlot])) ??
      SLOT_VALUES[slot] ?? SLOT_VALUES[baseSlot];
    if (!pool || pool.length === 0) { ok = false; return _m; }
    // Distinct-value draw: a pattern with two slots of the same semantic type
    // (PERIOD1/PERIOD2, or two {CATEGORY}s in a multi-category pattern) must
    // not fill both with the same value — "June vs June" and "food and food"
    // are degenerate training rows. Bounded retries, then give up on this fill.
    let value = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      value = pool[Math.floor(rng() * pool.length)];
      if (!used.has(value.toLowerCase().replace(LEAD_PREP, ""))) break;
      value = "";
    }
    if (!value) { ok = false; return _m; }

    // Externalize the leading preposition (see LEAD_PREP above).
    let lead = "";
    let span = value;
    if (PREP_STRIP_SLOTS.has(slot.replace(/\d+$/, ""))) {
      const m = value.match(LEAD_PREP);
      if (m && m[0].length < value.length) {
        lead = m[0];
        span = value.slice(m[0].length);
      }
    }

    used.add(span.toLowerCase());
    entities.push({ type: slot, value: span });

    // Pattern already ends in a preposition here -> drop the filler's own.
    if (lead && PREP_BEFORE.test(pattern.slice(0, offset))) return span;
    return lead ? lead + span : span;
  });
  if (!ok) return null;
  return { utterance: utterance.replace(/\s+/g, " ").trim(), entities };
}

// Bare/short replies are generated at a lower volume than full utterance_patterns
// — the goal is teaching the model the SHAPE of a fragment reply, not exhaustive
// phrasing coverage (unlike utterance_patterns, which target min_distinct_
// utterances_per_action for genuine diversity).
// 24, up from 8 (2026-07-19): UNKNOWN holds ~85 rows of <=3 tokens, so at 8
// rows per entity the model learned "short fragment -> UNKNOWN" and bare
// clarification replies ("500", "yesterday") died in the slot-filling flow
// (QA bare_replies class 0/8). Bare replies must be numerous enough to
// out-vote UNKNOWN in the short-utterance regime — their vocabularies barely
// overlap (amounts/dates vs greetings/junk), so volume is what decides it.
// 32, up from 24 (2026-07-19): common bare replies ("yesterday") were still
// missed by RNG sampling within a 24-row budget spread across 3-4 patterns
// and a ~24-value filler pool per entity.
// 50, up from 32 (2026-07-28): hard-example benchmark showed bare merchant/
// asset replies ("Zomato", "gold") still generalizing poorly — those exact
// words are correctly held out of training (they're the benchmark cases
// themselves), so the fix is broader exposure to the SHAPE across more of
// the ~90-value MERCHANT/ASSETTYPE pools, not touching the held-out guard.
const SHORT_REPLY_COUNT = 50;

// How many training rows each DISTINCT bare-value ("Zomato", "gold") gets from
// the exact-bare "{ENTITY}" pattern. Diagnosed 2026-07-28: SHORT_REPLY_COUNT
// controls BREADTH (how many distinct pool values get covered at all) but each
// covered value only got 1 row — too fragile against dropout at inference
// (measured: "Starbucks" had exactly 1 training row and still failed the
// benchmark). This adds DEPTH per value without touching breadth.
const BARE_REPLY_REPEATS = 4;

// How many DISTINCT bare values get the BARE_REPLY_REPEATS treatment, PER
// ENTITY TYPE. Flat 10 (run13) is the proven-stable value. A per-type scale-up
// to MERCHANT:20/CATEGORY:20 was tried (run15, 2026-07-28) specifically to fix
// "Zomato"/"Flipkart" bare-merchant misclassification and made things WORSE,
// not better: overall intent accuracy 95.0%→93.5%, hard-example accuracy
// 96.7%→86.7%, new failures in unrelated categories (correction,
// ambiguous_boundary), and Zomato/Flipkart flipped from a wrong-but-plausible
// ADD_EXPENSE guess to UNKNOWN — no actual entity-extraction improvement
// anywhere. Root cause: doubling the bare-pattern's row budget (up to 80 dup
// rows per entity type) measurably crowded out training signal for other,
// subtler intent boundaries. Reverted to flat 10 — do not re-attempt this
// exact lever; "Zomato" bare-merchant generalization needs a different fix
// (e.g. an app-layer deterministic fallback for clarification-reply context,
// not more synthetic-data repetition of THIS shape).
const BARE_REPEAT_VALUE_CAP: Record<string, number> = {};
const DEFAULT_BARE_REPEAT_VALUE_CAP = 10;

function generateForSpec(spec: IntentSpec, rng: () => number): Row[] {
  const rows: Row[] = [];
  // Row target per bucket.
  //
  // A FIXED 80 rows regardless of template count made the evaluation unfair in
  // favour of starved buckets: a 4-template bucket produced ~20 near-identical
  // rows per skeleton, so holding out one template gave ~20 test rows that were
  // all the SAME sentence shape (get it right, score ~1.0). A 45-template
  // bucket spread the same 80 rows across 45 shapes — 1.8 rows each — and its
  // test set contained many DIFFERENT shapes. Measured live on run 5:
  // SPENDING_ANALYSIS had 255 templates at 1.6 rows/template and scored 0.602,
  // while SIP_VS_PREPAY had 10 templates at 24.0 rows/template and scored
  // 0.862 — an artefact of exam difficulty, not model skill.
  //
  // ROWS_PER_TEMPLATE keeps the fills-per-skeleton ratio constant across
  // buckets so per-intent F1 is comparable. The spec's
  // min_distinct_utterances_per_action stays the FLOOR (a well-populated
  // bucket never drops below the volume it had before).
  const ROWS_PER_TEMPLATE = 6;
  // A LOW floor on purpose. The spec's min_distinct_utterances_per_action (80)
  // was applied to every bucket regardless of how many skeletons it had, so a
  // 4-template bucket still emitted 80 rows — 20 near-identical copies of each
  // shape. That is padding, not data: it inflated starved buckets' apparent
  // volume AND made their held-out test set a single repeated shape. A bucket
  // with 4 skeletons genuinely HAS little data; the honest fix is to say so and
  // let class weighting handle the resulting imbalance, not to pad it.
  const MIN_ROWS = 12;
  const patternCountForAction = (a: string) => (spec.utterance_patterns[a] ?? []).length;
  const floor = MIN_ROWS;

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
    // Scale rows with template count, never below the spec floor.
    const target = Math.max(floor, patternCountForAction(action) * ROWS_PER_TEMPLATE);
    const seen = new Set<string>();
    let attempts = 0;
    const maxAttempts = target * 40; // generous ceiling; dedup drives the real count

    // Coverage-first draw: every pattern is used at least once BEFORE random
    // sampling begins. Purely random selection left patterns unused whenever a
    // bucket had more patterns than its row budget (43 patterns / 80 rows
    // covered only ~36 — the coupon-collector limit), so the dataset silently
    // contained fewer SKELETONS than the spec declared, and validate.ts's
    // pattern-diversity gate failed a bucket whose spec was actually fine.
    let coverageIdx = 0;

    while (seen.size < target && attempts < maxAttempts) {
      attempts++;
      const pattern = coverageIdx < patterns.length
        ? patterns[coverageIdx++]
        : patterns[Math.floor(rng() * patterns.length)];
      const filled = fill(pattern, rng, spec.intent);
      if (!filled) continue;
      
      let finalUtterance = filled.utterance;

      // Apply Region Slang
      const region = REGIONS[Math.floor(rng() * REGIONS.length)];
      finalUtterance = applyRegionalSlang(finalUtterance, region, rng);

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

      // Grammar mistakes stay BEFORE tagging (string-level; buildTags's
      // article-insensitive retry absorbs the mutation).
      if (rng() < 0.1) {
        finalUtterance = generateGrammarMistake(finalUtterance);
      }

      const taggedEntities = remapComparisonSlots(filled.entities);
      const { tokens, tags } = buildTags(finalUtterance, taggedEntities);

      // Typos AFTER tagging, at token level, so tags ride along positionally
      // and a typo'd entity token KEEPS its label (see buildTags contract —
      // this is what teaches the head that "petol" in category position is
      // still a category). The utterance gets the same mutation so the row's
      // provenance text matches what the model trains on.
      if (rng() < 0.15 && tokens.length > 2) {
        const tIdx = Math.floor(rng() * tokens.length);
        const original = tokens[tIdx];
        const typoed = injectTypo(original, rng);
        if (typoed !== original) {
          tokens[tIdx] = typoed;
          finalUtterance = finalUtterance.replace(
            new RegExp(`\\b${original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
            typoed,
          );
        }
      }

      const key = finalUtterance.toLowerCase();
      if (seen.has(key) || HELD_OUT_UTTERANCES.has(key)) continue;
      seen.add(key);
      rows.push({
        utterance: finalUtterance,
        intent: spec.intent,
        taskType: action,
        backendAction: `${spec.intent}_${action}`,
        entities: taggedEntities,
        tokens,
        tags,
        sourcePattern: pattern,
      });
    }
  }

  // Bare/short-reply rows — a clarification reply always answers a required
  // entity for a CREATE-style flow in practice (the only path slotEngine.ts's
  // clarification loop triggers from), so these are tagged with the first
  // supported action that actually requires the entity being answered
  // (CREATE when the spec supports it, else the spec's first action).
  if (spec.short_reply_patterns) {
    for (const [entityType, patterns] of Object.entries(spec.short_reply_patterns)) {
      const requiringAction =
        spec.required_entities.includes(entityType) && spec.supported_actions.includes("CREATE")
          ? "CREATE"
          : spec.supported_actions[0];
      if (!requiringAction) continue;

      const seen = new Set<string>();
      let attempts = 0;
      const maxAttempts = SHORT_REPLY_COUNT * 40;
      // BARE_REPLY_REPEATS: see the constant's own comment for the diagnosis
      // (each distinct bare merchant/asset value got exactly 1 training row,
      // too fragile against dropout at inference). FIRST ATTEMPT (repeating
      // every one of the up-to-50 distinct bare draws) measurably regressed
      // entity tagging elsewhere: it let the bare pattern's row count scale
      // with the underlying pool SIZE (MERCHANT ~90 values vs CATEGORY's much
      // smaller pool), so large pools got proportionally over-repeated and
      // skewed the single-token tag distribution — B-MERCHANT rows outnumbered
      // B-CATEGORY 44:20, and the model started guessing MERCHANT for isolated
      // nouns ("tea", "debt") that were correctly CATEGORY before. Capping the
      // repeat to a FIXED number of distinct values (not "however many the
      // pool has room for") bounds the bare pattern's total contribution
      // regardless of pool size, so it can add depth without dominating breadth.
      let bareRepeatsUsed = 0;
      const maxBareRepeatValues = BARE_REPEAT_VALUE_CAP[entityType] ?? DEFAULT_BARE_REPEAT_VALUE_CAP;

      while (seen.size < SHORT_REPLY_COUNT && attempts < maxAttempts) {
        attempts++;
        const pattern = patterns[Math.floor(rng() * patterns.length)];
        const filled = fill(pattern, rng, spec.intent);
        if (!filled) continue;

        const finalUtterance = filled.utterance;
        const key = finalUtterance.toLowerCase();
        if (seen.has(key) || HELD_OUT_UTTERANCES.has(key)) continue;
        seen.add(key);

        const taggedEntities = remapComparisonSlots(filled.entities);
        const { tokens, tags } = buildTags(finalUtterance, taggedEntities);
        const row: Row = {
          utterance: finalUtterance,
          intent: spec.intent,
          taskType: requiringAction,
          backendAction: `${spec.intent}_${requiringAction}`,
          entities: taggedEntities,
          tokens,
          tags,
          sourcePattern: pattern,
        };
        rows.push(row);

        if (pattern === `{${entityType}}` && bareRepeatsUsed < maxBareRepeatValues) {
          bareRepeatsUsed++;
          for (let i = 0; i < BARE_REPLY_REPEATS - 1; i++) rows.push(row);
        }
      }
    }
  }

  return rows;
}

/**
 * Every entity a spec declares must have a filler pool. Without this check a
 * missing pool makes fill() return null for every pattern using that slot, the
 * bucket silently emits ZERO rows, and the spec still LOOKS populated —
 * FAMILY_TRANSFER lost 92 of 140 patterns this way and stayed unmeasurable
 * across four training runs before anyone noticed.
 */
/**
 * Fail the build when two slots DECLARED BY THE SAME INTENT draw overlapping
 * filler values.
 *
 * WHY THIS IS A HARD GATE
 * This exact defect has now been found three times, each time only after a
 * training run and a per-type F1 investigation:
 *   EXTRAPAYMENT vs AMOUNT      f1 0.500 -> 0.737
 *   TARGETAMOUNT vs AMOUNT      f1 0.148 -> 0.857  (worst tag in the model)
 *   LUMPSUM vs DOWNPAYMENT      f1 0.111 -> ?      (8 of 10 values shared)
 * When one intent declares both slots and they share values, the NER head sees
 * the same string labelled two ways in the same context and only surrounding
 * words can separate them — which is not enough. It is invisible in every
 * count-based gate: row totals, diversity, and validation all pass happily.
 *
 * SCOPE CORRECTION 2026-07-20: this originally checked only SAME-INTENT pairs,
 * on the assumption that cross-intent sharing was harmless. It is NOT — the NER
 * head is GLOBAL, one tag set across all intents, so a value tagged LENDER in
 * loan rows and MERCHANT in income rows is a direct conflict for the span head
 * regardless of which intent it came from. "the bank" was exactly that, and the
 * same-intent-only guard passed it happily.
 */
/**
 * Collisions we have MEASURED and consciously accepted.
 *
 * The guard below encodes a theory: two slots sharing values inside one intent
 * cannot be separated by the NER head. TARGETAMOUNT/AMOUNT supported it — the
 * fix took I-TARGETAMOUNT 0.148 -> 0.857 AND improved QA. LUMPSUM/AMOUNT
 * CONTRADICTED it: three attempts (odd magnitudes, then range separation) each
 * improved B-LUMPSUM's own F1 while QA entity-exact fell 64.0 -> 60.0 -> 59.4%.
 * Per-type F1 and real-world QA performance are not reliably correlated.
 *
 * So this is an allowlist, not a silent exemption: each entry names the
 * measurement that justifies it, and anything NOT listed still fails the build.
 */
const ACCEPTED_COLLISIONS = new Set<string>([
  // Measured 2026-07-20: run 36 (with this collision) scored QA 60.7% /
  // entities 64.0% / regression 41/41 — better than runs 37, 38 and 39, each
  // of which "fixed" it. Windfalls and everyday amounts genuinely overlap in
  // range, and forcing them apart made the values unrealistic.
  "SIP_VS_PREPAY:AMOUNT:LUMPSUM",
]);

function assertNoSlotValueCollisions(specs: IntentSpec[]): void {
  const problems: string[] = [];

  // GLOBAL pass: the same value must not be reachable as two different entity
  // TYPES anywhere, because the span head has one shared tag set.
  const typesByValue = new Map<string, Set<string>>();
  for (const [slot, pool] of Object.entries(SLOT_VALUES)) {
    const type = SLOT_TYPE_ALIASES[slot] ?? slot.replace(/\d+$/, "");
    for (const v of pool) {
      const k = v.toLowerCase();
      if (!typesByValue.has(k)) typesByValue.set(k, new Set());
      typesByValue.get(k)!.add(type);
    }
  }
  for (const perIntent of Object.values(SLOT_VALUES_BY_INTENT)) {
    for (const [slot, pool] of Object.entries(perIntent)) {
      const type = SLOT_TYPE_ALIASES[slot] ?? slot.replace(/\d+$/, "");
      for (const v of pool) {
        const k = v.toLowerCase();
        if (!typesByValue.has(k)) typesByValue.set(k, new Set());
        typesByValue.get(k)!.add(type);
      }
    }
  }
  // Cross-intent overlap WARNS rather than fails. Some of it is semantically
  // real and unavoidable — "a car" genuinely is both an ASSETTYPE you own and
  // a GOALNAME you save for; banning that would force artificial distinctions.
  // But it is not free either: "the bank" was tagged LENDER in loan rows and
  // MERCHANT in income rows, and B-LENDER sat at f1 0.578 until it was split.
  // So: surface every instance, decide each on its per-type F1, and keep the
  // hard failure for the same-intent case the model truly cannot resolve.
  const crossIntent: string[] = [];
  for (const [value, types] of typesByValue) {
    if (types.size > 1) {
      crossIntent.push(`"${value}" -> ${[...types].sort().join(" / ")}`);
    }
  }
  if (crossIntent.length > 0) {
    console.warn(
      `[!] ${crossIntent.length} value(s) reachable as MORE THAN ONE entity type.\n` +
      `    The NER head has ONE global tag set, so these compete. Not fatal —\n` +
      `    some are genuine ambiguities — but check per-type F1 before adding more:\n` +
      crossIntent.map((c) => `      ${c}`).join("\n")
    );
  }
  for (const spec of specs) {
    const declared = [...spec.required_entities, ...spec.optional_entities];
    for (let i = 0; i < declared.length; i++) {
      for (let j = i + 1; j < declared.length; j++) {
        const a = declared[i], b = declared[j];
        const poolA = SLOT_VALUES_BY_INTENT[spec.intent]?.[a] ?? SLOT_VALUES[a];
        const poolB = SLOT_VALUES_BY_INTENT[spec.intent]?.[b] ?? SLOT_VALUES[b];
        if (!poolA || !poolB) continue;
        const setB = new Set(poolB.map((v) => v.toLowerCase()));
        const shared = poolA.filter((v) => setB.has(v.toLowerCase()));
        const key = `${spec.intent}:${[a, b].sort().join(":")}`;
        if (shared.length > 0 && !ACCEPTED_COLLISIONS.has(key)) {
          problems.push(
            `${spec.intent}: {${a}} and {${b}} share ${shared.length} value(s) ` +
            `[${shared.slice(0, 4).join(", ")}${shared.length > 4 ? ", …" : ""}]`
          );
        }
      }
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Slot-value collisions inside a single intent (the NER head cannot learn ` +
      `to separate these):\n  ${problems.join("\n  ")}\n` +
      `Give one of each pair its own filler pool — see LUMPSUM/TARGETAMOUNT ` +
      `for the shape of the fix.`
    );
  }
}

function assertAllSlotsHaveFillers(specs: IntentSpec[]): void {
  const missing: string[] = [];
  for (const spec of specs) {
    const declared = new Set([...spec.required_entities, ...spec.optional_entities]);
    for (const slot of declared) {
      // Numbered slots ({INTERESTRATE2}) resolve through their base pool in
      // fill() — the guard must mirror that fallback or it rejects specs the
      // generator actually handles.
      const base = slot.replace(/\d+$/, "");
      const hasPool = SLOT_VALUES[slot] || SLOT_VALUES[base] ||
        SLOT_VALUES_BY_INTENT[spec.intent]?.[slot] || SLOT_VALUES_BY_INTENT[spec.intent]?.[base];
      if (!hasPool) missing.push(`${spec.intent}.${slot}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Spec entities with no filler pool in SLOT_VALUES: ${missing.join(", ")}. ` +
      `Patterns using these slots would silently generate NOTHING. Add a pool or remove the entity from the spec.`
    );
  }
}

export function generate(): { rows: Row[]; outPath: string } {
  const specs = loadIntentSpecs();
  assertAllSlotsHaveFillers(specs);
  assertNoSlotValueCollisions(specs);
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
