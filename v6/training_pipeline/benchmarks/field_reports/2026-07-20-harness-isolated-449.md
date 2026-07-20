# Field report — isolated run, 449 cases (2026-07-20, run 29b model)

First **uncontaminated** run. `isolated mode: ON`, single batch, 449 cases,
0 errors, 191 ms avg. These numbers are trustworthy; the earlier runs were not.

---

## 1. The contamination fix worked

| | contaminated runs | **isolated run** |
|---|---|---|
| ghost entities traceable to a preceding case | 31 | **0** |

**Correction to my own earlier method:** the markdown report groups cases by
intent, so adjacent entries in the file are *not* adjacent in execution order.
My first "traceable to previous query" pass compared against the wrong
neighbour. The 31 figure still held (those pairings were genuine), but 3
residual hits I flagged in this run are NOT contamination — see §4.

---

## 2. Coverage is good; the failure mode moved

19 of 19 intents and 15 of 15 taskTypes exercised. The distribution is
top-heavy (SPENDING_ANALYSIS 26.7%, BUDGET_PLANNING 18.7%) but every intent
was reached.

| metric | value |
|---|---|
| UNKNOWN | 66 (14.7%) |
| below 0.5 confidence floor | 66 (14.7%) |
| zero entity spans | 123 (27.4%) |

---

## 3. HEADLINE: UNKNOWN is swallowing answerable queries — 60 of 66

Only **6** of the 66 UNKNOWN predictions are the intentional junk/refusal
cases. The other 60 are things the product genuinely supports. Grouped by what
they should have been:

### 3.1 ALLOCATION phrasings — the largest single cluster (~22)
`BUDGET_PLANNING` declares ALLOCATION as a supported action, yet:
- "allocate ₹80000 across rent food and savings"
- "how much should i keep for rent from ₹60000"
- "allocate ₹75000 for this month" · "allocate ₹20000 only for essentials"
- "help me distribute ₹95000"

The verb *allocate/distribute/keep-for* is essentially untrained. This is one
cheap pattern family away from working.

### 3.2 Hinglish — 9, entirely unsupported
"mera kitna kharcha hua is mahine", "kitna bcha mere pass abhi",
"emi kab tk chalegi", "wo rahul wala transfer del krdo",
"mera salry 85000 ayi aaj"

**Needs a product decision before any work:** do we support Hinglish? If yes it
needs dedicated training data (it is a different language surface, not a
synonym gap). If no, the QA suite should *assert* UNKNOWN so it stops reading
as a defect.

### 3.3 Loan/debt reads — 7, including plain English
- "what's my total outstanding loan amount right now"
- "is my home loan interest rate too high"
- "is my current EMI burden healthy for my salary"

LOAN_ANALYSIS won only 8 of 449 cases (1.8%) while these fell to UNKNOWN. That
intent is genuinely weak, not merely under-sampled — consistent with the
earlier contaminated run, so this survived isolation.

### 3.4 Budget reads — 7
"what budgets do i have this month", "rent budget this month",
"travel budget this year", "summarize all my budgets"

BUDGET_PLANNING|SUMMARY exists; these plain reads still miss.

### 3.5 Writes — 8
- add/log: "gave ₹120 to the local tea shop this morning", "paid ₹3 lakh as
  house rent today", "salary of ₹85000 credited today"
- edit/delete: "change the Starbucks bill to ₹350", "the IRCTC booking was
  ₹48,500 instead", "remove the cashback income entry"

Note "salary of ₹85000 credited today" → UNKNOWN here, whereas in the
contaminated run it "worked" by inheriting the previous case's entities. A
case that isolation revealed as broken, not caused.

---

## 4. NAVIGATE leaked into predictions

One case returned `NAVIGATE`, which is a `Layer1Intent` in CognitionTypes but
**not one of the 19 model intents** and has no action-mask entry. It arrived
via the rules layer, not the model. Harmless here, but it means the app can
emit an intent the mask and the route map do not cover — worth a guard.

## 5. The 3 residual ghost spans (not contamination)

Cases like "when will I become debt free at my current EMI" emit span
`liabilitytype=loan` when no "loan" token exists in the query. A BIO decoder
cannot invent a token, so this is post-decode normalisation (likely
`spansToLegacyEntities` canonicalising a tagged token such as "EMI" → "loan").
Cosmetically wrong in the report and worth tracing, but not a state leak.

---

## 6. Still unmeasurable: no ground truth

The harness records what the model said, never what it should have said. Every
judgement above is mine, by inspection — no accuracy figure can be computed.
**Highest-value next change to the harness:** accept
`query | EXPECTED_INTENT | EXPECTED_TASKTYPE` and self-grade, so each batch
yields a real pass/fail number and failures drop straight into
`qa_scenarios.jsonl`.

---

## 7. Priority

1. **ALLOCATION verb family** (§3.1) — ~22 cases, cheapest large win.
2. **Loan/debt reads** (§3.3) — a weak intent on a core advisory surface.
3. **Budget reads** (§3.4) and **write edit/delete** (§3.5).
4. **Hinglish** (§3.2) — *product decision first*, then data or QA assertion.
5. Harness ground-truth grading (§6).
6. Carry-forward from run 1, unchanged: silent wrong-period substitution,
   category synonym gaps, "Analyze" → ANALYSIS, SUMMARY/INSIGHTS/ANALYSIS
   boundary.
