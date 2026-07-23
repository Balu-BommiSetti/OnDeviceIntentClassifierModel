# SPENDING_ANALYSIS — Reviewed Remediation Map (v1)

**Discipline:** this is a *review artifact*, not a spec edit. Per `expandPatterns.ts`
convention, a human approves before any merge writes `SPENDING_ANALYSIS.intent.json`.

**Core correction vs plan v3:** the plan says *delete*. In all four items, blanket
deletion destroys legitimate, in-distribution coverage. The correct operations are
**MOVE** (relabel to the right taskType), **REWORD** (per-line, judged), and **KEEP**
(the primary signal is already correct). Deletion is reserved for true duplicates only.

A naive keyword script was measured to **mis-handle 6 of 36 ANOMALY patterns** (it would
move genuine anomalies like "sudden jump", "surprise increases", "odd trends"). This is
why the map is human-reviewed, not `sed`.

Bucket sizes before: SUMMARY 110 · BREAKDOWN 47 · ROOT_CAUSE 131 · TREND 68 · COMPARISON 77
· TOP_SPENDERS 60 · ANOMALY 87 · SUBSCRIPTIONS 60 · AVERAGES 45  (total 685).

---

## Item 1 — ANOMALY_DETECTION: MOVE 30 (not delete 36), KEEP 57

Patterns with **no** anomaly signal (unusual/spike/deviation/sudden/surprise/odd/flag)
belong elsewhere. Move — do not delete: "give me insights on my spending" is a real
production query; deleting it just guarantees the model never learns to route it.

| → target | pattern |
|---|---|
| SUMMARY | give me insights on my spending |
| SUMMARY | what can you tell me about my spending this month |
| SUMMARY | what does my latest monthly statement reveal about my spending habits |
| SUMMARY | find any noticeable patterns in my recent transactions |
| SUMMARY | outline any seasonal patterns in my spending habits |
| SUMMARY | any insights on my spending {PERIODSHORT} |
| SUMMARY | what insights do you have about my expenses |
| SUMMARY | spending insights for {PERIODSHORT} |
| SUMMARY | show me some insights about my money habits |
| SUMMARY | got any insights on where my money went {PERIODSHORT} |
| SUMMARY | meri spending insights dikhao {PERIOD} *(Hinglish — keep language)* |
| SUMMARY | meri monthly spending ka summary {PERIOD} *(Hinglish — literally "summary")* |
| SUMMARY | analyze my expense for {PERIOD} and suggest savings opportunities |
| SUMMARY | do you see any pattern of late payments that could be costing me interest |
| BREAKDOWN | insights into my {CATEGORY} spending |
| BREAKDOWN | let me know if my exposure to {CATEGORY} is above average |
| BREAKDOWN | check if my {CATEGORY} spending aligns with the budget I set |
| BREAKDOWN | are there any indirect fees in my {CATEGORY} purchases that I haven't noticed |
| BREAKDOWN | can you detect any seasonal shifts in my {CATEGORY} spending over {PERIOD} |
| BREAKDOWN | highlight any seasonal shifts in my {CATEGORY} spending pattern |
| TREND | I want to see if my expenses are trending up or down this month |
| TREND | can you summarize my {CATEGORY} spend trend over the last {PERIOD} |
| TREND | which {CATEGORY} category shows the biggest growth trend over the past {PERIOD} |
| COMPARISON | what does my spending look like compared to the same time last year |
| COMPARISON | compare my current spending to previous month and highlight differences |
| COMPARISON | compare my {CATEGORY} purchases to my average over the last {PERIOD} |
| TOP_SPENDERS | share any insights on where most of my money goes during {PERIOD} |
| TOP_SPENDERS | give me a rundown of my biggest {CATEGORY} expenses over the last {PERIOD} |
| SUMMARY | spot any hidden patterns in my monthly {CATEGORY} expenses |
| SUMMARY | do you detect a sudden jump in my {CATEGORY} costs compared to prior year → **KEEP** (sudden jump = anomaly) |

> The last row is an example of a naive-script false positive — it stays in ANOMALY.

**KEEP (57):** every pattern containing unusual / anomaly / spike / surge / deviation /
sudden / jump / surprise / odd / weird / abnormal / flag / fraud / out-of-ordinary.

---

## Item 2 — ROOT_CAUSE → TOP_SPENDERS: MOVE 10

"top merchants / biggest contributors / culprits" is TOP_SPENDERS's job. Clean move.
(Where a moved pattern also says "budget", apply the Item 4 reword after moving.)

- identify the top merchants responsible for my {CATEGORY} outlays in {PERIOD}
- show me the main contributors to my {CATEGORY} outlays during {PERIOD}
- show me the biggest contributors to my {CATEGORY} outlays during {PERIOD}
- reveal the top merchants that spike my {CATEGORY} spend recently *(has "spike" — see note)*
- where can I see the biggest contributors to my {CATEGORY} expenses
- which merchants are the biggest culprits behind my {CATEGORY} costs
- what are the biggest contributors to my {CATEGORY} outlay this month
- which expenses in {CATEGORY} are the biggest contributors this {PERIOD}
- what is the biggest drain on my {CATEGORY} budget → move + reword "budget"→"spend"
- what parts of my {CATEGORY} budget are the biggest contributors → move + reword

> "reveal the top merchants that **spike** my spend" contains both TOP_SPENDERS and
> ANOMALY signals — a genuine ambiguity. Recommend TOP_SPENDERS (the head-noun is
> "top merchants") and drop "spike" on reword → "reveal the top merchants driving my
> {CATEGORY} spend recently".

---

## Item 3 — SUMMARY multi-category: KEEP additive, REWORD ~6 bare (do NOT bulk-delete 17)

Two-category queries are **not automatically comparisons**. "sum up food and travel",
"combined X and Y costs", "total X and Y" are unambiguous *additive* SUMMARY queries —
deleting them removes a real capability. The discriminator is the **additive word**
(total / combined / sum / plus / across / how much). Only the *bare* forms overlap
COMPARISON's "{C1} and {C2}".

**KEEP as SUMMARY (has additive word — 11):**
total {C1} and {C2} spending · total for {C1} and {C2} · combined {C1} and {C2} costs ·
spend across {C1} and {C2} for {PERIODSHORT} · show {C1} plus {C2} expenses ·
sum up {C1} and {C2} · how much did I spend on {C1} and {C2} · how much on {C1},{C2} and
{C3} · spending on {C1},{C2} and {C3} · in {PERIODSHORT} what did I spend on {C1} and {C2}
· for {PERIODSHORT} show {C1} and {C2} costs

**REWORD (bare/ambiguous — 6) — needs product decision (see below):**
my spending on {C1} and {C2} {PERIODSHORT} · what went to {C1} and {C2} {PERIODSHORT} ·
my {C1} and {C2} bills {PERIODSHORT} · {PERIODSHORT} spending on {C1} and {C2} ·
my {C1} and {C2} spend, {PERIODSHORT} · spending on {C1} and {C2} {PERIODSHORT}

Recommended: prefix an additive word → "combined {C1} and {C2} …" so they stay clean
SUMMARY. Alternative: delete. **Do not** silently leave them ambiguous.

---

## Item 4 — SUBSCRIPTIONS "hidden": KEEP 9, REVIEW 1 (do NOT delete 10)

9 of 10 "hidden" patterns **also** carry the strong SUBSCRIPTIONS signal
(recurring / subscription / monthly). "hidden" is a modifier, not the class — these are
legitimate subscription queries. Deleting them removes real coverage.

**KEEP (recurring/subscription signal present):**
can you find any hidden subscription that appears every month · do my statements reveal
any hidden recurring costs for {CATEGORY} over {PERIOD} · are there any hidden monthly
fees in my {CATEGORY} transactions over {PERIOD} · where are the hidden recurring fees …
· can you uncover any hidden recurring {MERCHANT} fees … · do I have any hidden monthly
costs for {CATEGORY} … · are there any hidden recurring charges in my {CATEGORY}
transactions … · what hidden recurring payments do I have for {CATEGORY} … · are there
any hidden recurring {CATEGORY} charges hidden within my recent statements

**REVIEW (no recurring word — borderline ANOMALY):**
"do I have any hidden regular fees in my recent transactions" — "regular" leans
recurring; recommend KEEP but could go ANOMALY. Single-pattern call.

---

## Item 5 — ROOT_CAUSE "budget" reword: PER-LINE, 1 is mislabeled

Blanket `budget`→`spending` is unsafe. Per-line:

| pattern | action |
|---|---|
| what is eating my budget {PERIOD} | reword → "what is eating into my spending {PERIOD}" |
| what is draining my {CATEGORY} budget {PERIOD} | reword → "...draining my {CATEGORY} spending" |
| what is eating my {CATEGORY} budget {PERIOD} | reword → spending |
| what is causing my {CATEGORY} budget to disappear | reword → "...{CATEGORY} spending to climb" |
| analyse my {CATEGORY} budget burn {PERIOD} | reword → "...{CATEGORY} spending {PERIOD}" |
| which expenditure patterns drive my {CATEGORY} budget | reword → "...drive my {CATEGORY} spending" |
| how can I identify the factor skewing my {CATEGORY} budget this week | reword → spending |
| mera budget {CATEGORY} pe kyun khatam ho raha hai? | reword Hindi → "{CATEGORY} pe itna kharcha kyun ho raha hai?" |
| **why did my {CATEGORY} budget exceed last {PERIOD}** | **NOT a reword — this is a budget-limit query → move to BUDGET_PLANNING** |

The last row is the exact cross-intent leak the plan tried to fix by find-replace — but
find-replace would have turned a real BUDGET_PLANNING query into a malformed ROOT_CAUSE
one. It must **move intents**, not swap a noun.

---

## Net effect on balance
Moving (not deleting) conserves ~685 within-intent, shifting mass from the two bloated
buckets (ROOT_CAUSE 131, ANOMALY 87) toward SUMMARY/BREAKDOWN/TREND — which *improves*
the 2.9× imbalance. A rebalancing generation pass (Section 2 work) then levels buckets to
~80–100 each, above the validate.ts floor of 40.
