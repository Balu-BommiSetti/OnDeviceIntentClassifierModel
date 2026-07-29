# Phase 3 gap collection (batch for next training run)

Running list of real, live-log-confirmed classification gaps found after run 21
(currently deployed, synced 2026-07-29). Each entry is added as discovered;
nothing gets fixed one-at-a-time anymore — this session's lesson (3 failed
single-issue retrains, then a bucket-imbalance fight over ONE template) is that
single-template patches barely move noisy/long queries and burn a full
train+verify cycle each time. Collect here, batch into ONE dataset change,
ONE retrain, ONE verification pass — same discipline as Phase 2.

**Rule for whoever works this list**: before adding new templates, re-run the
FULL regression suite + a representative sample from every PRIOR fix batch
(Phase 1, Phase 2, run 21) to confirm nothing already-fixed breaks. Bucket-
imbalance discipline: check `npm run dataset:validate` after every spec edit,
not just at the end — trim before it fails, don't batch all edits and
discover the ceiling once at the end.

## Run 22 (training, started 2026-07-29) — batch covering items 0, 0b, 1, 2

Templates added:
- SPENDING_ANALYSIS|SUMMARY (+5): "how much did I spend?" / "how much have I
  spent" reinforcement (item 0), "can you list down all the transaction of
  top {CATEGORY} category" (item 1, per user's confirmed meaning: single
  biggest spending category WITHIN loans/debt), 2 rambling/typo'd variants of
  the "list transactions under {CATEGORY} over {AMOUNT}" shape (item 2)
- LOAN_ANALYSIS|SUMMARY (+7): bare "list/know all my commitments/EMIs"
  templates, no LIABILITYTYPE/LENDER filled (item 0b)
- SIP_VS_PREPAY|COMPARISON (+2): floor-raiser only, to keep
  SPENDING_ANALYSIS|SUMMARY (now 870 rows) under the 4x bucket-imbalance
  ceiling against the smallest bucket (now 222 rows) — not a gap fix
- buildRegressionSuite.ts: added an EXTRA_CASES array (first use) holding
  "how much did i spend?" -> SPENDING_ANALYSIS/SUMMARY, so this exact phrase
  can never silently regress across a future run undetected again (item 0's
  action item). Suite is now 60 cases (was 59).

Pre-train checks: zero cross-intent utterance collisions confirmed,
dataset:validate PASS, manifest v1.0.32 built. Training log: /tmp/train_run22.log

Run 22 result: regression suite 57/60 (95%), ZERO regressions vs baseline.
Item 0 (critical) FIXED: "how much did i spend?" -> SPENDING_ANALYSIS/SUMMARY
@ 0.793 (was UNKNOWN @ 39.9%). Item 0b mostly fixed (4/5 phrasings routed
correctly), but "what all commitments am I having" still misclassified to
CASHFLOW_WARNING/SUMMARY @ 0.522 (near-floor confusion vs. CASHFLOW_WARNING's
"can I cover all my commitments" templates) — added 3 more contrastive
LOAN_ANALYSIS|SUMMARY variants. Item 1 routed (was UNKNOWN) but to the wrong
engine (LOAN_ANALYSIS instead of SPENDING_ANALYSIS, "loan" keyword pulling it
away) — added 2 more SPENDING_ANALYSIS-anchored variants. Item 2's noisy
query still misrouted (now SIP_VS_PREPAY/SUMMARY) — root-caused to the exact
"more THEN a lakh" typo (not "than") not being covered by any template;
added a matching variant.

Round 2 (run 23, 2026-07-29): +6 templates (3x LOAN_ANALYSIS|SUMMARY
contrastive commitments variants, 2x SPENDING_ANALYSIS|SUMMARY top-category
variants, 1x SPENDING_ANALYSIS|SUMMARY "more then" typo variant). Zero
collisions, validate PASS, manifest v1.0.33, formal regression suite held at
57/60 with zero regressions vs baseline — BUT direct inference against the
PROTECTED checklist (not just the formal suite) showed it made things worse:
"list all transactions under debt where I spent more than a lakh" flipped to
SIP_VS_PREPAY/SUMMARY (was correct SPENDING_ANALYSIS/SUMMARY through runs
21+22), "goals" flipped to ADD_EXPENSE/CREATE (was correct GOAL_PLANNING),
"can you list down my emis" flipped to a DIFFERENT wrong intent
(DEBT_FREEDOM_ANALYSIS/SCHEDULE) rather than getting fixed. Confirmed this
is NOT run-to-run training noise (determinism was fixed in commit cbbf834e,
same seed = same weights for identical data) — it's a real, data-driven
side effect of round 2's additions perturbing short/generic-phrase buckets
elsewhere. Lesson: the formal regression suite (one case per intent|taskType,
first-pattern-only) is NOT sufficient to catch this — it missed all 3 of
these because none of them are the bucket's first-pattern representative.
**The protected checklist must be spot-checked with direct inference on
every retrain, not just the formal suite pass rate.**

DECISION: discarded run 23. Reverted specs to round-1 (run 22) state exactly
(regenerated dataset -> same specsHash 5bf021c5e2d9 as manifest v1.0.32,
confirmed byte-identical), restored exported_model/ from
exported_model_archive/20260729-161030-seed42 (run 22's artifacts), re-ran
inference to reconfirm run 22's exact results, then synced run 22 to the app
(app_sync.py + WP_APP_DIR codegen). App-side npx tsc --noEmit and the
Jest/node:test suite show zero NEW issues vs. pre-sync baseline (confirmed
via git stash A/B: the 6 tsc errors and 3 test failures present are ALL
pre-existing, unrelated to this sync).

## Round 3 (run 24, 2026-07-29) — final authorized retrain, then CLOSED
User explicitly capped this batch at one more training attempt ("don't keep
for future, let's close it now, will train it once only"). Added, scoped
narrowly to avoid round 2's collateral damage: 2 new SPENDING_ANALYSIS|SUMMARY
templates using "biggest debt category" / "top spending category under debt"
(avoiding the bare word "loan" to route around the LOAN_ANALYSIS lexical
collision) for item 1, plus the exact "more THEN a lakh" typo variant for
item 2. Deliberately left item 0b's "what all commitments am I having" alone
(soft near-floor miss, not worth the collateral risk).

Result: the FORMAL regression suite itself caught 2 genuine regressions this
time (57/60 -> 56/60): "change yesterday income to 500" flipped from
ADD_INCOME/UPDATE to ADD_INCOME/CREATE, and "am I going to run out of money"
flipped from CASHFLOW_WARNING/SUMMARY to CASHFLOW_WARNING/ANALYSIS. Direct
inference also showed item 1's fix partially worked (both new anchor phrases
correctly routed to SPENDING_ANALYSIS) but "goals" regressed again (->
ADD_EXPENSE) and item 2's typo variant still failed (near-floor 0.519,
routed to DEBT_FREEDOM_ANALYSIS instead). Same collateral-damage pattern as
round 2, this time bad enough to fail the formal suite itself.

DECISION (final, per "train once only" — no further retrain attempted):
discarded run 24. Reverted specs to run 22's exact state (regenerated
dataset -> specsHash 5bf021c5e2d9, byte-identical to manifest v1.0.32/34),
restored exported_model/ from exported_model_archive/20260729-161030-seed42,
re-verified inference matches run 22 exactly, re-synced to the app
(app_sync.py + WP_APP_DIR codegen).

## Round 4 (run 25, 2026-07-29) — 2nd retrain attempt, user-authorized after
## round 3 failed. Narrowed further per user request ("i want both" gaps,
## but 1 change each): typo variant for item 2, plus a {CATEGORY}-SLOTTED
## (not hardcoded "debt") top-spending-category template for item 1, to
## train across varied category fillers instead of overfitting to one
## lexical collision with LOAN_ANALYSIS.

Result: formal regression suite caught ANOTHER regression (56/60, 1 new):
"expense breakdown yesterday" flipped from SPENDING_ANALYSIS/BREAKDOWN to
ADD_EXPENSE/CREATE (was passing). Third consecutive attempt to touch these
2 gaps, third time a DIFFERENT unrelated bucket broke. This is now a
consistent pattern, not bad luck: any SPENDING_ANALYSIS|SUMMARY template
addition destabilizes some other short/generic-phrase bucket somewhere in
the 20-intent space, seemingly at random each time.

DECISION (final — user authorized exactly ONE retrain beyond run 22, this
was it): discarded run 25 too. Reverted specs to run 22's exact state again
(specsHash 5bf021c5e2d9 confirmed byte-identical), restored exported_model/
from exported_model_archive/20260729-161030-seed42, re-verified against the
full protected checklist (all pass, including the ALREADY-ACCEPTED
"expense breakdown yesterday" taskType-only miss — not a new regression,
one of the 4 pre-existing accepted misses from the original checklist),
re-synced to the app, confirmed zero new tsc/test issues.

## Round 5 (run 26, 2026-07-29) — 4th and FINAL retrain attempt, user
## explicitly authorized despite the 3-for-3 failure pattern. Same 2
## templates as round 4 (typo variant + slotted top-category variant).
## Zero collisions, validate PASS, manifest v1.0.39/40.

Result: WORST of the 4 attempts. Formal suite passed this time (56/60, "No
regressions vs prior baseline" — different baseline snapshot than round 4's,
so not directly comparable), but direct inference against the protected
checklist showed 4 failures: "goals" broke AGAIN (-> ADD_EXPENSE, 4th time),
"am I going to run out of money" broke AGAIN (exact repeat of round 3's
regression), "expense breakdown yesterday" broke AGAIN (exact repeat of
round 4's regression) — AND, worse than every prior round, the 2 NEW target
queries THEMSELVES still failed post-training: the typo variant routed to
DEBT_FREEDOM_ANALYSIS (not SPENDING_ANALYSIS), and the top-category query
routed to the wrong taskType (TOP_SPENDERS instead of SUMMARY). 4 attempts,
4 failures, with recurring damage concentrated on the same handful of
fragile buckets ("goals", CASHFLOW_WARNING taskType, ADD_EXPENSE competing
with SPENDING_ANALYSIS|BREAKDOWN) regardless of which 2 SUMMARY templates
were added. This is now conclusive: template-count increases to
SPENDING_ANALYSIS|SUMMARY (already the model's largest bucket) are not a
viable lever for these 2 gaps with the current architecture/training setup.

DECISION: discarded run 26. Reverted specs to run 22's exact state
(specsHash 5bf021c5e2d9 confirmed byte-identical to manifests v1.0.32/34/36/
38/40), restored exported_model/ from
exported_model_archive/20260729-161030-seed42, re-verified inference matches
run 22 exactly, re-synced to the app, confirmed zero new tsc/test issues.

## FINAL STATE — Phase 3 CLOSED, run 22 is what's live in the app.
4 separate retrain attempts across rounds 2-5 for the 2 residual gaps (top-
category routing, "more THEN a lakh" typo), 4 separate failures, each
breaking a different unrelated bucket. DO NOT ATTEMPT A 5TH RETRAIN on this
lever — the pattern is conclusive, not unlucky.

Both gaps ARE fully closed for users, WITHOUT touching the model: a
deterministic regex override was added to chatRouting.ts (SPEND_LIST_
UNDER_CATEGORY_RE / SPEND_LIST_THRESHOLD_RE / SPEND_TOP_CATEGORY_RE,
step "0a", added 2026-07-29) that catches the "list/show ... transaction(s)
... more than/over/above/exceeding {amount}" and "... top ... category"
shapes BEFORE the classifier's routing decision is trusted, and forces
intentOverride: ANALYZE_SPENDING / taskType: SUMMARY. It reuses the same
deterministic (non-ML) category/amount extraction the engine already runs
internally (findCategoriesInText, extractMinAmount), so it is exactly as
reliable as normal engine dispatch and carries zero model risk. Verified:
catches both target queries, does not false-positive on any of the 19-item
protected checklist. This is the correct, final fix for these 2 gaps — if
either query still misbehaves live, debug chatRouting.ts's step 0a first,
not the model.
Shipped and live: item 0 (the critical "how much did I spend" regression,
now fixed and permanently covered by the regression suite) and item 0b
partial (4 of 5 commitments/EMI phrasings now route correctly). NOT fixed,
and NOT to be re-attempted without explicit new instruction: item 0b's
"what all commitments am I having" (stays CASHFLOW_WARNING @ ~0.52), item 1
("top loan category" still routes to LOAN_ANALYSIS, not SPENDING_ANALYSIS),
item 2 (the "more THEN a lakh" typo variant still misroutes). These 3 are
real but lower-severity (soft misclassifications, not hard UNKNOWNs) and
sit in a genuine lexical-collision zone ("loan"/"debt"/short generic
commitment phrasing) that resisted two separate scoped-template attempts —
any future fix likely needs a different technique (e.g. per-bucket
confidence calibration, not just more raw templates) rather than a third
attempt at the same approach.

## Gaps found — STATUS: item 0 FIXED and synced (run 22). Items 0b/1/2
## partially fixed; residuals moved to "Residual gaps for a FUTURE batch"
## above. Original write-ups kept below for historical diagnosis detail.

### 0. CRITICAL REGRESSION: "how much did I spend" -> UNKNOWN — FIXED, synced run 22
- Query: "how much did i spend?" (also fails without the "?", confirmed identical
  tokens either way — not a punctuation issue)
- Result: intent=SAVINGS_ADVICE @ 39.9% (below the app's confidence floor ->
  surfaces as UNKNOWN live), taskType SUMMARY @ 91.9%, zero entities
- Found: 2026-07-29, live log, user confirms "it was working in past"
- Severity: HIGHEST — this is one of the single most common, basic
  SPENDING_ANALYSIS queries in the whole app. A confirmed live regression,
  not a coverage gap.
- Confirmed via direct inference: the exact phrase IS still present verbatim
  in SPENDING_ANALYSIS.intent.json's SUMMARY action (140 templates, unchanged
  membership) — so this is NOT a removed-template issue, it's a confidence/
  competition shift from the CUMULATIVE effect of runs 20+21's dataset
  changes (new SAVINGS_ADVICE Hindi templates, new SPENDING_ANALYSIS
  ROOT_CAUSE/BUDGET_PLANNING additions, the bucket-imbalance trimming churn
  on SPENDING_ANALYSIS|SUMMARY specifically) pulling confidence away from
  SPENDING_ANALYSIS toward SAVINGS_ADVICE for this exact phrase. No single
  obvious template collision found on inspection — needs either (a) explicit
  contrastive reinforcement (add several MORE "how much did I spend"-shaped
  variants to SPENDING_ANALYSIS to out-weigh whatever pulled confidence away),
  or (b) if that doesn't work, a harder look at what specifically changed
  in SAVINGS_ADVICE's templates between run 19 and run 21.
- **ACTION ITEM**: this exact phrase ("how much did I spend") MUST be added to
  the regression suite (v6/training_pipeline's regression-suite source, not
  just this doc) so a future run can never silently reintroduce this — it was
  NOT in the regression suite before, which is exactly why 2 full training
  runs shipped with this broken and nobody caught it until a live user did.

### 0b. "list/know my commitments/EMIs" — zero coverage, all UNKNOWN
- Queries, all confirmed live UNKNOWN or zero-signal:
  - "What all commitments i am having" -> UNKNOWN (generic fallback)
  - "May i know my commitments" -> UNKNOWN (generic fallback)
  - "can you list down my emis" -> UNKNOWN @ 52.1%, taskType SCHEDULE @ 22.1%, zero entities
  - "can you provide all my emis" -> UNKNOWN @ 49.7%, taskType ANALYSIS @ 41.8%, zero entities
- Found: 2026-07-29, live log — asked as natural follow-ups right after
  "Analyze my EMIs" (which itself was just fixed app-side, see
  wealthpilot_native_app's FinanceDispatcher.ts ANALYZE_LOAN case — that fix
  is unrelated to this gap and already shipped; this is purely the model
  never having learned this PHRASING at all).
- Diagnosis: LOAN_ANALYSIS's SUMMARY/ANALYSIS actions are full of
  "{LIABILITYTYPE} from {LENDER}"-style templates (a SPECIFIC named loan) but
  have essentially nothing for the bare "list ALL my commitments/EMIs, no
  specific loan named" shape — the exact shape the app-side fix above now
  has real logic to answer well (LoanAnalysisMath.analyzeCommitments), so
  this is worth prioritizing: the backend capability now EXISTS and is
  correct, it just never gets reached because the classifier can't route
  these phrasings to LOAN_ANALYSIS/ANALYSIS at all.
- Target: LOAN_ANALYSIS SUMMARY and/or ANALYSIS — add bare "list/show/know
  all my commitments/EMIs/loans" templates (no {LIABILITYTYPE}/{LENDER}
  filled in — that's the point, these are general-burden questions).

### 1. "top [category] category" transaction listing — UNKNOWN
- Query: "can you list down all the transaction of top loan category"
- Result: intent=UNKNOWN, confidence=55.8%, taskType=SUMMARY @ 2.0%, zero entities
- Found: 2026-07-29, live log
- Diagnosis: SPENDING_ANALYSIS's TOP_SPENDERS action has templates for
  "top {CATEGORY} expenses ranked" / "top merchants in {CATEGORY}" but nothing
  for the bare "list transactions of top X category" shape (no ranking
  language, no "merchants", just "top loan category" as a single noun phrase
  meaning "my biggest spending category within loans").
- Target: SPENDING_ANALYSIS — likely TOP_SPENDERS or ROOT_CAUSE, needs a
  product decision on which (does "top category" mean "rank my categories" or
  "show transactions in my single biggest category"?) — ASK before templating,
  don't guess.

### 2. Very long / typo'd / rambling sentences don't fully resolve even with a matching template
- Query: "can you list down all the transaction under the debt where all i spend the money worth of more then a lakh"
- Result (post run-21 fix): intent=DEBT_FREEDOM_ANALYSIS (wrong; should be
  SPENDING_ANALYSIS), "a" mistagged as AMOUNT again
- A clean paraphrase of the SAME intent ("list all transactions under debt
  where I spent more than a lakh") DOES work correctly post run-21
  (SPENDING_ANALYSIS/SUMMARY @ 96%) — so the fix is real, just doesn't
  generalize to this much sentence noise/redundant phrasing ("all the...",
  "all i spend", "the money worth of") from ONE training example.
- Target: add 3-5 MORE phrasing variants of the "list transactions under
  {CATEGORY} over {AMOUNT}" shape to SPENDING_ANALYSIS, including some with
  redundant/rambling filler words, to actually generalize rather than
  memorize one exact phrasing. Was capped at 1 template last round purely
  because of the bucket-imbalance validator ceiling (SPENDING_ANALYSIS|SUMMARY
  was already near the 4x ceiling before this fix even started) — batching
  with OTHER intents' additions in the same run gives more room to also grow
  the smallest bucket (SIP_VS_PREPAY|COMPARISON, 210 rows) if needed, instead
  of only ever trimming the largest one.

### 3. Bare "debt" now resolves to UNKNOWN (soft regression, not urgent)
- Post run-21: bare "debt" -> UNKNOWN @ 57%, taskType NONE @ 60%
- Previously (run 20 and earlier) resolved to ADD_EXPENSE with no entity
  (also not correct, but at least a stable non-UNKNOWN answer)
- Not the run-12-class bug (bare "debt" is NOT being wrongly tagged
  B-MERCHANT — that stays fixed), just weaker/less useful now than before.
  Low priority — note and re-check after the next batch, don't chase alone.

## Already fixed, DO NOT re-break (regression checklist for the next retrain)
Sample these every time before syncing a new model:
- "how much did i spend?" -> SPENDING_ANALYSIS/SUMMARY, confidence must stay
  above the app's confidence floor (run 22, item 0 — the critical regression;
  also now in the formal regression suite via EXTRA_CASES in
  buildRegressionSuite.ts, so it's double-covered)
- "can you provide all my emis" / "may I know my commitments" ->
  LOAN_ANALYSIS/SUMMARY (run 22, item 0b partial — do NOT assume ALL 0b
  phrasings are fixed, "what all commitments am I having" and "can you list
  down my emis" are NOT, see residual gaps above)
- "can you analyse my loans" / "my commitments" / "goals" -> LOAN_ANALYSIS / LOAN_ANALYSIS / GOAL_PLANNING (run 19)
- "will I reach my vacation goal by december" -> GOAL_PLANNING, GOALNAME+TARGETDATE extracted (pre-existing, protected through every run since)
- "is my EMI load too high for my income" -> LOAN_ANALYSIS (pre-existing)
- "tea" bare -> must NOT tag B-MERCHANT (run-12 regression class)
- "paisa kaise bachau" -> SAVINGS_ADVICE (Hindi)
- "sip vs prepay my home loan" -> SIP_VS_PREPAY, LIABILITYTYPE extracted
- "mera salary 85000 ayi aaj" -> ADD_INCOME/CREATE, AMOUNT extracted (run 20, Hindi)
- "make the transfer to Priya 1800" -> FAMILY_TRANSFER, SPLITWITH+AMOUNT extracted (run 20, named-person)
- "how much did I spend on Uber yesterday" -> SPENDING_ANALYSIS, MERCHANT extracted separately from the date word (run 20, NER-merge fix)
- "list all transactions under debt where I spent more than a lakh" -> SPENDING_ANALYSIS/SUMMARY @ ~96% (run 21)
- Formal regression suite: must stay at or above 56/59 with ZERO new
  regressions beyond the 4 already-accepted taskType-only misses
  ("am I going to run out of money", "how can I save more", "spending",
  "expense breakdown yesterday")

## App-layer fixes already shipped (no retrain needed, don't duplicate)
- Lakh-shorthand ("1.5l" -> 150000) — NumericResolver.ts, both repos
- Bare "a"/"an" never resolves to amount 1 — NumericResolver.ts, both repos
- minAmount transaction-list filtering ("transactions over X") — SpendingEngine.ts + FinanceDispatcher.ts (app repo)
- SpendingEngine categorySql exact-match fix (no more substring "debt" false-positives) — SpendingEngine.ts (app repo)
- CashflowEngine double-counting monthlyGoalFunding (surplus going wrongly
  negative when goal contributions existed both as a transaction AND in
  fund_logs) — CashflowEngine.ts (app repo)
- ₹1 Cr Journey chip opening a goal-creation confirmation instead of showing
  Journey progress — moved the isJourneyQuery check to chatRouting.ts, BEFORE
  the write-confirmation branch (a dispatcher-level-only fix was unreachable
  code here — chatRouting.ts intercepts write-shaped actionPayloads earlier
  in the pipeline than FinanceDispatcher.dispatch ever runs) — chatRouting.ts
  (app repo)
- ANALYZE_LOAN always falling back to the generic cashflow narrative instead
  of a real loan/EMI answer — LoanAnalysisMath.analyzeCommitments was
  imported but never called; FinanceDispatcher.ts wired it in for the
  general "no specific loan named" case, matching the exact
  commitmentMath/isSpecific shape InsightGenerator.generateLoanInsights
  expects — FinanceDispatcher.ts (app repo)
- STUCK LOADING BUG (real severity — worth remembering the CLASS of bug, not
  just this instance): isInsightWhyQuery/isCutSpendFollowUp's async helper
  calls ran BEFORE sendMessage's try/finally block started, so if either
  threw, `loading` got stuck `true` forever and every future message
  silently no-op'd via the `if (loading) return;` guard — with ZERO logs.
  This is exactly what "queries aren't even touching the agent layer" looks
  like from the outside. Fixed by moving setLoading(true) + the ENTIRE rest
  of the function body inside one try/finally — ai-chat.tsx (app repo).
  Lesson for future async early-return checks in this function: anything
  after setLoading(true) MUST be inside the try, no exceptions, or this
  exact class of silent-lockup bug reappears.
