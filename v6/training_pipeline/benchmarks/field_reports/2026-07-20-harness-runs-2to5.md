# Field report — harness runs 2–5 (2026-07-20, run 29b model)

409 cases total across 5 concatenated runs. Runs 2–5 (**369 cases**) used the
new generation prompt; run 1 (40 cases) is the old batch, analysed separately.

**Bottom line: do not trust the accuracy numbers from these runs.** The harness
was contaminating cases with each other. Fixed now, but the runs must be
repeated. Coverage, however, is genuinely fixed and that result stands.

---

## 1. The prompt worked

| | run 1 (old prompt) | runs 2–5 (new prompt) |
|---|---|---|
| distinct intents exercised | 1 real (5 incl. misfires) | **19 / 19** |
| distinct taskTypes exercised | 3 / 15 | **15 / 15** |
| cases | 40 | 369 |

Distribution is no longer collapsed onto one intent. It is still lumpy —
BUDGET_PLANNING 22.8%, ADD_EXPENSE 14.9%, SPENDING_ANALYSIS 14.1%, while
INCOME_DECLARATION / NET_WORTH_CHECK / SAVINGS_ADVICE got 1 case each — but
that lumpiness is now partly *the model's* doing (see §3), not the generator's.

---

## 2. BLOCKER: the harness contaminated its own cases

`CognitionFacade.process()` prepends any open clarification to the next
utterance:

```ts
const pending = store.pendingConversation;
const textToPredict = pending ? `${pending.originalMessage} ${normalized}` : normalized;
```

Correct for real chat slot-filling. Ruinous for a test suite: the harness ran
cases back-to-back through one shared store, so any case that triggered a
clarification silently prepended itself to the **next** case, and the model
predicted on two concatenated queries.

**31 cases carry entities provably from the immediately preceding query.**
(Normalization artifacts like `₹2 lakh → 200000` were excluded before counting.)

| case | ghost entity | came from previous case |
|---|---|---|
| "salary of ₹85000 credited today" | `merchant=starbucks`, `period=last week` | "delete the Starbucks coffee expense from last week" |
| "spent 1.5k on groceries at DMart yesterday" | `merchant=swiggy`, `category=food`, `2,450` | "paid ₹2,450 to Swiggy for food delivery today" |
| "received ₹850 refund from Flipkart today" | `liabilitytype=bike loan` | "remove the bike loan entry" |
| "fuel bharwaya ₹2,300 today" | `merchant=myntra`, `category=clothing` | "spent ₹4,250 on Myntra for clothing yesterday" |
| "that Uber ride was ₹430 not ₹380" | `category=grocery`, `date=2,850` | "change my grocery expense to ₹2,850" |

31 is a **floor, not a ceiling** — that count only catches leaks visible as
ghost *entities*. Cases where contamination flipped the intent or taskType
without leaving an entity trace are undetectable from the output.

**Fixed** (`NlpTestHarnessScreen.tsx`): isolated mode, default ON, clears
`pendingConversation` + `lastContext` before each case. There is now a UI
toggle and a line in the report header, so a contaminated run can never again
look identical to a clean one. Turn it OFF only to test multi-turn deliberately.

**Action: re-run these batches with isolated mode ON before drawing any
conclusion about model quality.**

---

## 3. Signals that look real despite the contamination

These are unlikely to be explained by carry-over, but confirm after a clean re-run.

### 3.1 UNKNOWN is over-firing on answerable queries — 49 of 54
Only 5 of the 54 UNKNOWN predictions are the intentional junk/refusal cases.
The rest are things the app genuinely supports:

- **Write intents:** "change my bonus income to ₹25000", "remove the cashback
  income entry", "took a home loan of ₹45 lakh from SBI at 8.4% for 20 years",
  "change the Starbucks bill to ₹350"
- **Loan advisory (a whole surface):** "is my home loan interest rate too high",
  "is my current EMI burden healthy for my salary", "which loan has the highest
  interest rate", "should I refinance first or just continue"
- **Hinglish:** "mera kitna kharcha hua is mahine", "kitna bacha is month"
- **Between-ranges:** "groceries between January and February"

LOAN_ANALYSIS took only 8 of 369 cases while these four loan questions fell to
UNKNOWN — that intent looks genuinely weak, not just under-sampled.

### 3.2 Hinglish is unsupported
The prompt requested it, the model has no answer for it. This is a product
decision as much as a training one: **do we support Hinglish at all?** If yes it
needs dedicated training data; if no, the QA suite should assert UNKNOWN for it
rather than leaving it ambiguous.

### 3.3 28.7% of cases extracted zero entity spans
106 of 369. Some are legitimately entity-free ("am I over budget"), but the
rate is high enough to suspect the span head is still the weak component —
consistent with entity-exact sitting at 62.4% in the QA suite.

### 3.4 14.6% below the 0.5 confidence floor
54 cases would trigger a clarification prompt rather than an answer. Whether
that is right behaviour depends on how many are *correct* predictions being
suppressed — unknowable without ground truth (§4).

---

## 4. The structural gap: no expected values

The harness records what the model *said*, never what it *should have said*, so
no accuracy number can be computed from these files — only defect-hunting by
inspection. Every "accuracy" claim about these runs would be my judgement, not
a measurement.

**Recommendation:** extend the harness input format to optional expectations,
e.g. `query | EXPECTED_INTENT | EXPECTED_TASKTYPE`, and have it self-grade.
That turns each batch into a real pass/fail number and lets failures flow
straight into `qa_scenarios.jsonl`.

---

## 5. Priority

1. **Re-run all batches with isolated mode ON.** Everything below is
   provisional until then.
2. Add expected-value grading to the harness (§4).
3. Investigate UNKNOWN over-firing on write + loan queries (§3.1) — likely the
   largest genuine quality gap.
4. Product decision on Hinglish (§3.2).
5. Carry forward from run 1: silent wrong-period substitution, category synonym
   gaps, "Analyze" → ANALYSIS, SUMMARY/INSIGHTS/ANALYSIS boundary.
