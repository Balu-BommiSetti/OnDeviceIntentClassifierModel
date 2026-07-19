/**
 * Pattern-expansion validation tests (Phase 1). These guard the five
 * auto-validation rules that stand between an LLM's output and the specs —
 * the only thing preventing a bad candidate from poisoning training data.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { skeletonKey, validateCandidate, evalSuiteKeyForUtterance, checkActionShape, findLiteralEntityValue, repairPlaceholders, assertBalancedPlaceholders, checkAffordabilityShape, ValidationContext } from "../expandPatterns";

const spec: any = {
  intent: "ADD_EXPENSE",
  description: "test",
  supported_actions: ["CREATE", "ANALYSIS"],
  required_entities: ["AMOUNT"],
  optional_entities: ["CATEGORY", "MERCHANT", "DATE", "PERIOD"],
  utterance_patterns: {},
};

function ctx(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    spec,
    action: "CREATE",
    existingKeys: new Set<string>(),
    crossIntentKeys: new Map<string, string>(),
    evalSuiteKeys: new Set<string>(),
    ...over,
  } as ValidationContext;
}

test("skeletonKey erases slots, articles and punctuation", () => {
  assert.equal(skeletonKey("spent {AMOUNT} on {CATEGORY}"), "spent on");
  // Different slot in the same position collapses to the same skeleton —
  // deliberate: they are the same sentence shape.
  assert.equal(skeletonKey("spent {AMOUNT} on {MERCHANT}"), "spent on");
  assert.equal(skeletonKey("paid the {AMOUNT} bill!"), "paid bill");
});

test("accepts a well-formed CREATE pattern", () => {
  assert.equal(validateCandidate("spent {AMOUNT} at {MERCHANT}", ctx()).ok, true);
});

test("rule 1: rejects a slot the spec does not declare", () => {
  const v = validateCandidate("bought {ASSETTYPE} for {AMOUNT}", ctx());
  assert.equal(v.ok, false);
  assert.match(v.reason!, /illegal slot \{ASSETTYPE\}/);
});

test("rule 2: rejects a CREATE pattern missing a required entity", () => {
  const v = validateCandidate("bought something at {MERCHANT}", ctx());
  assert.equal(v.ok, false);
  assert.match(v.reason!, /missing required entity \{AMOUNT\}/);
});

test("rule 2: does NOT require entities for read-only actions", () => {
  assert.equal(validateCandidate("where did my money go", ctx({ action: "ANALYSIS" })).ok, true);
});

test("rule 3: rejects a duplicate skeleton in the same bucket", () => {
  const c = ctx({ existingKeys: new Set([skeletonKey("spent {AMOUNT} on {CATEGORY}")]) });
  const v = validateCandidate("spent {AMOUNT} on {MERCHANT}", c); // same shape
  assert.equal(v.ok, false);
  assert.match(v.reason!, /duplicate skeleton/);
});

test("rule 4: rejects a skeleton owned by another intent", () => {
  const c = ctx({ crossIntentKeys: new Map([[skeletonKey("log {AMOUNT} for {CATEGORY}"), "ADD_INCOME"]]) });
  const v = validateCandidate("log {AMOUNT} for {CATEGORY}", c);
  assert.equal(v.ok, false);
  assert.match(v.reason!, /collides with intent ADD_INCOME/);
});

test("rule 4: the SAME intent owning the skeleton is not a collision", () => {
  const c = ctx({ crossIntentKeys: new Map([[skeletonKey("log {AMOUNT} for {CATEGORY}"), "ADD_EXPENSE"]]) });
  // still caught by dedup if in-bucket, but not flagged as a cross-intent clash
  const v = validateCandidate("log {AMOUNT} for {CATEGORY}", c);
  assert.equal(v.ok, true);
});

test("rule 5: rejects a pattern matching a held-out eval-suite utterance", () => {
  // The suite row's entity VALUE is erased before keying, so a slotted
  // pattern and the filled held-out utterance compare slot-for-slot.
  const suiteKey = evalSuiteKeyForUtterance("how much did I spend last month", ["last month"]);
  const c = ctx({ action: "ANALYSIS", evalSuiteKeys: new Set([suiteKey]) });
  const v = validateCandidate("how much did I spend {PERIOD}", c);
  assert.equal(v.ok, false);
  assert.match(v.reason!, /Tier-2 leakage/);
});

test("rule 5: entity erasure is longest-first and case-insensitive", () => {
  const k = evalSuiteKeyForUtterance("spending on Food and Travel last two months", ["Food", "Travel", "last two months"]);
  assert.equal(k, "spending on and");
});

test("hygiene: REPAIRS trailing punctuation and rejects over-long patterns", () => {
  // Live regression: 75 valid ADD_EXPENSE|CREATE patterns were rejected for a
  // single trailing "?" that the tokenizer strips anyway.
  const v = validateCandidate("spent {AMOUNT} on {CATEGORY}?", ctx());
  assert.equal(v.ok, true, v.reason);
  assert.equal(v.repaired, "spent {AMOUNT} on {CATEGORY}");
  assert.match(validateCandidate("spent {AMOUNT} " + "x".repeat(130), ctx()).reason!, /too long/);
});

test("hygiene: rejects a slots-only pattern with no words", () => {
  const v = validateCandidate("{AMOUNT} {CATEGORY}", ctx());
  assert.equal(v.ok, false);
  assert.match(v.reason!, /empty after normalization/);
});

test("COMPARISON unlocks PERIOD1/PERIOD2 only when PERIOD is a spec entity", () => {
  const cmpSpec = { ...spec, intent: "SPENDING_ANALYSIS", required_entities: [], supported_actions: ["COMPARISON"] };
  const okCtx = ctx({ spec: cmpSpec as any, action: "COMPARISON" });
  assert.equal(validateCandidate("compare {PERIOD1} vs {PERIOD2}", okCtx).ok, true);

  // A spec without PERIOD must not gain the comparison roles.
  const noPeriod = { ...cmpSpec, optional_entities: ["CATEGORY"] };
  const v = validateCandidate("compare {PERIOD1} vs {PERIOD2}", ctx({ spec: noPeriod as any, action: "COMPARISON" }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /illegal slot \{PERIOD1\}/);
});

test("PERIOD1/PERIOD2 are rejected outside COMPARISON", () => {
  const v = validateCandidate("spent {AMOUNT} {PERIOD1}", ctx());
  assert.equal(v.ok, false);
  assert.match(v.reason!, /illegal slot \{PERIOD1\}/);
});

// ── Rule 6: action shape (semantic) ────────────────────────────────────────
// Regression guard for the live failure: a COMPARISON run returned 35/45
// SUMMARY-shaped patterns and every structural rule passed them.

test("rule 6: COMPARISON accepts two explicit period slots", () => {
  assert.equal(checkActionShape("compare my spending {PERIOD1} vs {PERIOD2}", "COMPARISON").ok, true);
});

test("rule 6: COMPARISON accepts one period plus a comparison cue", () => {
  assert.equal(checkActionShape("am I spending more than {PERIOD}", "COMPARISON").ok, true);
  assert.equal(checkActionShape("has my {CATEGORY} spend increased since {PERIOD}", "COMPARISON").ok, true);
});

test("rule 6: COMPARISON REJECTS summary-shaped patterns (the live failure)", () => {
  for (const p of [
    "Show me my {CATEGORY} spending for {PERIOD}",
    "Give me a breakdown of my {CATEGORY} expenses {PERIOD}",
    "What was my total spend on {CATEGORY} during {PERIOD}",
    "Display my {CATEGORY} spend during {PERIOD}",
  ]) {
    const v = checkActionShape(p, "COMPARISON");
    assert.equal(v.ok, false, p);
    assert.match(v.reason!, /not a COMPARISON/);
  }
});

test("rule 6: SUMMARY must not use comparison period slots", () => {
  const v = checkActionShape("totals for {PERIOD1} and {PERIOD2}", "SUMMARY");
  assert.equal(v.ok, false);
  assert.match(v.reason!, /that is a COMPARISON/);
});

test("rule 6: WHAT_IF requires a hypothetical cue", () => {
  assert.equal(checkActionShape("what if I pay {EXTRAPAYMENT} more", "WHAT_IF").ok, true);
  assert.equal(checkActionShape("show my loan balance", "WHAT_IF").ok, false);
});

test("rule 6: unconstrained taskTypes pass through", () => {
  assert.equal(checkActionShape("log {AMOUNT} for {CATEGORY}", "CREATE").ok, true);
  assert.equal(checkActionShape("why is my {CATEGORY} spend high", "ANALYSIS").ok, true);
});

// ── Rule 7: literal entity values ──────────────────────────────────────────
// Regression guard: 9 of 30 candidates in the second COMPARISON run baked a
// real category into the skeleton ("my food expenses" vs "my {CATEGORY} ...").

test("rule 7: detects a hardcoded category where a slot belongs", () => {
  assert.equal(findLiteralEntityValue("give me a breakdown of my food expenses from {PERIOD1}", spec), "food");
  assert.equal(findLiteralEntityValue("compare my grocery bills {PERIOD1} vs {PERIOD2}", spec), "grocery");
  assert.equal(findLiteralEntityValue("how do my utility bills compare {PERIOD1}", spec), "utility");
});

test("rule 7: a properly slotted pattern is clean", () => {
  assert.equal(findLiteralEntityValue("compare my {CATEGORY} spend {PERIOD1} vs {PERIOD2}", spec), null);
});

test("rule 7: text INSIDE a placeholder is never flagged", () => {
  assert.equal(findLiteralEntityValue("{CATEGORY} spend {PERIOD1}", spec), null);
});

test("rule 7: only flags values whose slot the spec declares", () => {
  const noCat = { ...spec, optional_entities: ["MERCHANT", "DATE", "PERIOD"] };
  assert.equal(findLiteralEntityValue("my food expenses {PERIOD}", noCat as any), null);
});

test("rule 7: wired into validateCandidate", () => {
  const v = validateCandidate("compare my food spend {PERIOD1} vs {PERIOD2}", ctx({ action: "COMPARISON", spec: { ...spec, intent: "SPENDING_ANALYSIS", required_entities: [] } as any }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /literal "food" should be a \{CATEGORY\}/);
});

test("rule 8: rejects non-ASCII punctuation lookalikes", () => {
  const v = validateCandidate("side\u2011by\u2011side {CATEGORY} {PERIOD1} vs {PERIOD2}", ctx({ action: "COMPARISON", spec: { ...spec, required_entities: [] } as any }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /non-ASCII punctuation/);
});

// ── Rule 9: placeholder integrity ──────────────────────────────────────────
// Regression guard: 12 of 42 candidates arrived with an unclosed "{PERIOD2".
// Because PLACEHOLDER requires the closing brace, the fragment read as literal
// TEXT and passed every slot check.

const LEGAL = new Set(["PERIOD1", "PERIOD2", "CATEGORY", "AMOUNT"]);

test("rule 9: repairs an unclosed KNOWN slot", () => {
  assert.equal(repairPlaceholders("compare {PERIOD1} vs {PERIOD2", LEGAL), "compare {PERIOD1} vs {PERIOD2}");
  assert.equal(repairPlaceholders("{CATEGORY spend", LEGAL), "{CATEGORY} spend");
});

test("rule 9: leaves an UNKNOWN fragment alone (ambiguous, must be rejected)", () => {
  assert.equal(repairPlaceholders("compare {NOTASLOT vs x", LEGAL), "compare {NOTASLOT vs x");
});

test("rule 9: already-valid patterns are untouched", () => {
  const p = "compare {PERIOD1} vs {PERIOD2}";
  assert.equal(repairPlaceholders(p, LEGAL), p);
});

test("rule 9: unbalanced braces are rejected", () => {
  assert.equal(assertBalancedPlaceholders("compare {PERIOD1} vs {PERIOD2").ok, false);
  assert.match(assertBalancedPlaceholders("a } b").reason!, /stray brace|unbalanced/);
  assert.equal(assertBalancedPlaceholders("compare {PERIOD1} vs {PERIOD2}").ok, true);
});

test("rule 9: validateCandidate repairs and PERSISTS the corrected pattern", () => {
  const cmp = { ...spec, intent: "SPENDING_ANALYSIS", required_entities: [] };
  const v = validateCandidate("compare {CATEGORY} spend {PERIOD1} vs {PERIOD2", ctx({ spec: cmp as any, action: "COMPARISON" }));
  assert.equal(v.ok, true);
  assert.equal(v.repaired, "compare {CATEGORY} spend {PERIOD1} vs {PERIOD2}");
});

test("rule 6: ANALYSIS accepts driver-phrasings that lack the word 'why'", () => {
  // Live regression: these 12 shapes were rejected by an over-anchored regex.
  for (const p of [
    "Which merchants are mainly contributing to my {CATEGORY} expenses in {PERIOD}",
    "Identify the biggest categories that are driving my bills over {PERIOD}",
    "Find out which purchases are behind my {CATEGORY} costs on {DATE}",
    "Reveal the merchant drivers behind my {CATEGORY} expenditures",
    "Which purchases are accountable for my {CATEGORY} spending",
    "Look into the major contributors to my {CATEGORY} costs during {PERIOD}",
    "Show me the causes of the surge in my {CATEGORY} spending",
    "What happened to cause my {CATEGORY} spending to climb",
    "What led to my {CATEGORY} expenses spiking on {DATE}",
  ]) {
    assert.equal(checkActionShape(p, "ANALYSIS").ok, true, p);
  }
});

test("rule 6: SUMMARY still rejects those same driver-phrasings", () => {
  assert.equal(checkActionShape("what is driving my {CATEGORY} spend", "SUMMARY").ok, false);
});

test("rule 6: TREND accepts trajectory phrasings and rejects two-period ones", () => {
  assert.equal(checkActionShape("is my spending going up over the last {PERIOD}", "TREND").ok, true);
  assert.equal(checkActionShape("show my {CATEGORY} spend month over month", "TREND").ok, true);
  assert.equal(checkActionShape("compare {PERIOD1} vs {PERIOD2}", "TREND").ok, false);
  assert.equal(checkActionShape("total spend for {PERIOD}", "TREND").ok, false);
});

// ── Rule 10: LUMPSUM vs EXTRAPAYMENT collision ─────────────────────────────
// A one-off windfall modelled as a recurring payment reports a payoff date
// years early — the worst failure this engine can produce.

test("rule 10: rejects windfall wording paired with the recurring slot", () => {
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM", "LIABILITYTYPE"] };
  const v = validateCandidate("what if my bonus of {EXTRAPAYMENT} goes to the loan",
                              ctx({ spec: debt as any, action: "WHAT_IF" }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /windfall wording with \{EXTRAPAYMENT\}/);
});

test("rule 10: rejects recurring wording paired with the one-time slot", () => {
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM"] };
  const v = validateCandidate("what if I pay {LUMPSUM} every month",
                              ctx({ spec: debt as any, action: "WHAT_IF" }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /recurring wording with \{LUMPSUM\}/);
});

test("rule 10: correct pairings pass", () => {
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM"] };
  assert.equal(validateCandidate("what if I pay {EXTRAPAYMENT} extra every month",
                                 ctx({ spec: debt as any, action: "WHAT_IF" })).ok, true);
  assert.equal(validateCandidate("what if I put a one time {LUMPSUM} on my loans",
                                 ctx({ spec: debt as any, action: "WHAT_IF" })).ok, true);
});

test("rule 10: a COMBINED lump-sum + recurring scenario is legitimate", () => {
  // The engine takes both simultaneously; the guard must not reject it.
  // Live false positive: "{LUMPSUM}" itself matched the /lump ?sum/ prose test.
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM"] };
  const v = validateCandidate("what if I put {LUMPSUM} in now and add {EXTRAPAYMENT} monthly",
                              ctx({ spec: debt as any, action: "WHAT_IF" }));
  assert.equal(v.ok, true, v.reason);
});

test("rule 10: 'bonus payment each month' is recurring, not a windfall", () => {
  // Live false positive: "bonus" was treated as a windfall word unconditionally.
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM"] };
  const v = validateCandidate("what if I commit to a {EXTRAPAYMENT} bonus payment each month",
                              ctx({ spec: debt as any, action: "WHAT_IF" }));
  assert.equal(v.ok, true, v.reason);
});

test("rule 10: an unambiguous windfall in the recurring slot is still caught", () => {
  const debt = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                 optional_entities: ["EXTRAPAYMENT", "LUMPSUM"] };
  const v = validateCandidate("what if my {EXTRAPAYMENT} inheritance goes to the loan",
                              ctx({ spec: debt as any, action: "WHAT_IF" }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /windfall wording/);
});

// ── Rule 11: DEBT vs LOAN intent boundary ──────────────────────────────────
// Live regression: the generator put state questions under DEBT|SUMMARY and
// the trained model collapsed LOAN_ANALYSIS to recall 0.03.

const debtSpec = { ...spec, intent: "DEBT_FREEDOM_ANALYSIS", required_entities: [],
                   supported_actions: ["SUMMARY"],
                   optional_entities: ["LIABILITYTYPE", "LENDER", "PERIOD", "TARGETDATE"] };
const loanSpec = { ...spec, intent: "LOAN_ANALYSIS", required_entities: [],
                   supported_actions: ["SUMMARY"],
                   optional_entities: ["LIABILITYTYPE", "LENDER", "PERIOD", "INTERESTRATE"] };

test("rule 11: DEBT rejects a pure state question", () => {
  for (const p of [
    "how much do I still owe in total",
    "give me a debt breakdown for {PERIOD}",
    "what is my outstanding on {LIABILITYTYPE}",
  ]) {
    const v = validateCandidate(p, ctx({ spec: debtSpec as any, action: "SUMMARY" }));
    assert.equal(v.ok, false, p);
    assert.match(v.reason!, /no trajectory cue/);
  }
});

test("rule 11: DEBT accepts genuine trajectory questions", () => {
  for (const p of [
    "when will I be free of my {LIABILITYTYPE}",
    "how long until everything is cleared",
    "how many payments remain on my loans",
    "give me my payoff timeline",
  ]) {
    assert.equal(validateCandidate(p, ctx({ spec: debtSpec as any, action: "SUMMARY" })).ok, true, p);
  }
});

test("rule 11: LOAN rejects a pure trajectory question", () => {
  const v = validateCandidate("when will my {LIABILITYTYPE} be paid off",
                              ctx({ spec: loanSpec as any, action: "SUMMARY" }));
  assert.equal(v.ok, false);
  assert.match(v.reason!, /that is DEBT_FREEDOM_ANALYSIS/);
});

test("rule 11: LOAN accepts state questions, including ones mentioning remaining balance", () => {
  for (const p of [
    "show my {LIABILITYTYPE} details",
    "what is my {LIABILITYTYPE} balance",
    "how much {LIABILITYTYPE} balance is remaining",
  ]) {
    assert.equal(validateCandidate(p, ctx({ spec: loanSpec as any, action: "SUMMARY" })).ok, true, p);
  }
});

// ── Per-intent taskType semantics ──────────────────────────────────────────
// ANALYSIS means "why is spending high" for SPENDING_ANALYSIS but "can I
// afford this" for AFFORDABILITY_CHECK. A single global meaning made the
// prompt and the validator disagree, rejecting 64 valid affordability
// patterns across two runs.

test("affordability shape accepts the phrasings a narrow cue rejected", () => {
  for (const p of [
    "is a {AMOUNT} {CATEGORY} within my budget",
    "do my savings cover a {AMOUNT} {CATEGORY}",
    "will a {AMOUNT} {CATEGORY} fit my spending plan",
    "am I financially comfortable buying a {AMOUNT} {CATEGORY}",
    "can I afford a {AMOUNT} {CATEGORY}",
    "would a {AMOUNT} purchase hurt my finances",
    "is {AMOUNT} too much to spend on {CATEGORY}",
  ]) {
    assert.equal(checkAffordabilityShape(p, "AFFORDABILITY_CHECK").ok, true, p);
  }
});

test("affordability shape still rejects an unrelated question", () => {
  const v = checkAffordabilityShape("show my spending breakdown for {CATEGORY}", "AFFORDABILITY_CHECK");
  assert.equal(v.ok, false);
  assert.match(v.reason!, /not an AFFORDABILITY question/);
});

test("affordability shape is a no-op for other intents", () => {
  assert.equal(checkAffordabilityShape("anything at all", "SPENDING_ANALYSIS").ok, true);
});

// ── Rule 12: BUDGET vs SPENDING boundary ───────────────────────────────────
// Live regression: 40/49 BUDGET|SUMMARY patterns were plain spending queries,
// and the benchmark showed "how much have i spent on travel this month"
// predicted as BUDGET_PLANNING instead of SPENDING_ANALYSIS.

const budgetSpec = { ...spec, intent: "BUDGET_PLANNING", required_entities: [],
                     supported_actions: ["SUMMARY", "STATUS", "ALLOCATION"],
                     optional_entities: ["CATEGORY", "AMOUNT", "PERIOD", "DATE"] };

test("rule 12: BUDGET rejects plain spending queries", () => {
  for (const p of [
    "How much did I spend on {CATEGORY} in {PERIOD}",
    "Show me my {PERIOD} total",
    "Breakdown of {CATEGORY} for {PERIOD}",
  ]) {
    const v = validateCandidate(p, ctx({ spec: budgetSpec as any, action: "SUMMARY" }));
    assert.equal(v.ok, false, p);
    assert.match(v.reason!, /no budget reference/);
  }
});

test("rule 12: BUDGET accepts patterns naming the budget concept", () => {
  for (const p of [
    "am I over budget on {CATEGORY}",
    "how much of my {CATEGORY} allocation is left",
    "is my {CATEGORY} spend exceeding its allocated {AMOUNT}",
    "have I gone over my planned amount for {CATEGORY}",
  ]) {
    assert.equal(validateCandidate(p, ctx({ spec: budgetSpec as any, action: "STATUS" })).ok, true, p);
  }
});

test("rule 12: ALLOCATION is exempt — it is budgeting by nature", () => {
  const v = validateCandidate("how should I split my income", ctx({ spec: budgetSpec as any, action: "ALLOCATION" }));
  assert.equal(v.ok, true, v.reason);
});

test("rule 12: prefix matching handles inflections (the \\b-after-prefix bug)", () => {
  // "allocat\\b" cannot match "allocated"; \\w* can.
  assert.equal(validateCandidate("is my {CATEGORY} spend exceeding its allocated {AMOUNT}",
    ctx({ spec: budgetSpec as any, action: "STATUS" })).ok, true);
  assert.equal(validateCandidate("how much of my {CATEGORY} budgeted amount remains",
    ctx({ spec: budgetSpec as any, action: "STATUS" })).ok, true);
});
