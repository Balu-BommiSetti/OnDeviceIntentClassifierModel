# Pipeline Backlog

Single source of truth for what is done, in flight, and pending across the
model repo and the app repo. Rule: **nothing falls off this list silently** —
items move to Done with evidence, or stay here with a priority. The live
visual mirror is the "Task & TaskType Tracker" artifact; this file is the
durable copy that survives sessions.

Last updated: 2026-07-19 (iteration 36 — commitment/risk vocabulary + EMI-pool fix + cross-suite contradiction resolved; run 29 training).

## P0 — blocks shipping

- [x] ~~Run 16 training~~ — SUCCESS TEST MET: debt classes recovered
  (debt_free 0→8/14, loan_targeting 0→7/10, prepay 0→6/25), entity gains
  held (42.9%). QA full pass 32.8% — best of three runs. BUT regression
  suite 34→31/39 and single_period 32→14%: see variance item.
- [x] ~~Run-to-run variance~~ — MEASURED (seeds 101/202/303, identical
  dataset). The ruler, as ranges:
    QA full pass   32.8% mean, range 2.4pt  (STABLE — trust deltas >3pt)
    QA entity      47.4% mean, range 1.1pt  (STABLE)
    QA intent      64.6% mean, range 7.3pt  (NOISY — deltas <7pt are noise)
    B-PERIOD rec   0.870 mean, range 6.7pt  (NOISY)
    hard examples  65.6% mean, range 10pt   (VERY NOISY — tiny suite)
  Consequences: (a) run 15→16 "single_period regression" was seed noise;
  (b) the debt-fix recovery (0→8/14 etc.) is far outside noise — real;
  (c) run 16 (seed 42) was an UNLUCKY entity draw: 42.9% vs all three seeds
  at 46.9–48.0. Run 17 (seed 101) training now to replace it.
- [x] ~~Per-seed model weights not saved~~ — seed_spread.sh now archives
  each seed's full exported_model/ directory alongside its reports.
- [x] **Confidence floor: resolved by ANALYSIS, kept at 0.50** — empirical
  sweep on QA confidences (run 26): correct-p10 0.67 vs wrong-median 0.60,
  distributions overlap with no clean separator. Floor 0.50 keeps 96.0% of
  correct and blocks 34.8% of wrong; 0.45 would recover 2pt of correct but
  HALVE wrong-blocking (34.8->17.4%). In a finance product a blocked-correct
  costs a clarification prompt, a passed-wrong costs a confidently wrong
  answer — the asymmetry favors 0.50. The 0.48 regression case is an
  unlucky borderline, not a calibration defect. Real lever remains model
  accuracy, not floor tuning.
- [x] ~~Retrain against new taxonomy + fixed spans~~ — run 15 done. RESULT:
  B-PERIOD recall 0.745→0.895, QA entities 32.0→42.3%, single_period 11→32%,
  comparisons 4→32%. Boundary-noise theory CONFIRMED. But QA intent fell
  74.1→64.0%: debt classes collapsed (see LOAN/DEBT boundary item).
- [ ] **Entity generalization** — the umbrella P0. The span head collapsed
  off-template (QA entity exact 32.0%). The preposition fix addresses the
  boundary-noise share of this; if QA entity accuracy is still weak after
  retraining, next levers in order: context diversity around spans in
  patterns, slots-head loss weighting, then architecture (CRF layer).
- [x] ~~Swap OllamaClient → IntentClassifier.predict()~~ — DONE (app repo,
  2026-07-19). OllamaClient.ts deleted (ngrok tunnel + faked 0.99 gone);
  CognitionFacade routes through IntentClassifier.predict() behind
  AI_FLAGS.ENABLE_ONDEVICE_NLP (default OFF); IntentClassifier applies
  action_mask.json in its taskType argmax; run-17 artifacts synced to
  assets/nlp (vocab 2552 == input_dim 2552, 19 intents) with 5.8MB of
  orphaned Jul-18 shards removed and app_sync.py taught to clean orphans.
  59/59 NLP unit tests pass; tsc clean on touched files.
- [ ] **FLIP DECISION: AI_FLAGS.ENABLE_ONDEVICE_NLP** — the flag is the last
  gate between the model and users. Flip when QA entity exact clears a bar
  the product owner sets (currently 48.6%). Flag-off path = legacy heuristic
  EntityExtractor flow (NOT the LLM — that is gone).
- [x] ~~INCOME_ANALYSIS route~~ — resolved by the ANALYZE_INCOME engine
  (see P1 Done). The flip has no remaining structural blockers: the decision
  is now purely the QA-entity quality bar.

- [ ] **QA intent accuracy still 64%** even after the debt fix lands, watch:
  run-15 collapse concentrated in LOAN_ANALYSIS↔DEBT_FREEDOM flips at conf
  0.47–0.51. If run 16 doesn't recover it, the two intents may need merging
  (user's rule 2) rather than boundary-sharpening.

## P1 — quality

- [x] **TFJS export schema bug (CRITICAL, user-found)** — the converter
  serialized topology from Keras 3; tfjs-layers implements the Keras 2
  schema (batch_shape vs batch_input_shape + dict inbound_nodes). Every
  export since the converter existed was self-consistent and UNLOADABLE; no
  gate loaded the TFJS artifact with a TFJS runtime. Fixed: converter now
  serializes via tf_keras (with an 'optional'-kwarg shim), and
  scripts/tfjs_smoke_test.mjs (app repo) loads the export with the app's own
  @tensorflow/tfjs and predicts — wired into app_sync.py as a HARD gate.
  Run 28 shipped (QA 51.4%, entities 62.9%, regression 39/41, smoke PASS);
  run 25 was NOT restorable — its .h5 was overwritten and only the broken
  export survived. LESSON: "verified" must mean the artifact was exercised
  by the runtime that consumes it, not that its structure is self-consistent.
- [x] ~~Archive per-run .h5 weights~~ — train.py now copies the full
  exported_model/ into exported_model_archive/<stamp>-seed<seed>/ after every
  run (newest 10 kept, gitignored). Run 28's export archived immediately as
  *-run28-DEPLOYED so the shipped model can always be rebuilt.

- [ ] **USER LIVE-TESTING IN PROGRESS** — flag ON in the app. DEPLOYMENT
  RULE (user-set, 2026-07-19): model updates to the app happen ONLY when the
  user explicitly asks; gates keep running per train run and results are
  staged. APP NOW RUNS 28 (QA 51.4%, entities 62.9%, regression 39/41, TFJS smoke
  PASS) — shipped out of necessity during the schema fix; runs 25/27 h5s were
  unrecoverable. Two loader-blocking bugs were found BY the user's testing
  and fixed: hardcoded 2-shard filenames (b614b3c) and the Keras-3 topology
  schema (cbf88e0). No further staged candidate — run 29 in training.
- [x] **Grader amount-normalization fix** — QA market_speech expectations
  assert NORMALIZED amounts ("150000") because the APP runs marketNormalize
  BEFORE the classifier; the harness feeds raw text, so the model correctly
  extracted surface spans ("1.5l","50k","12 cr") and was graded wrong for a
  normalization step that lives in a different component. Grader now
  canonicalises both sides. Same model re-measured: 47.0->47.8% full pass,
  entities 56.0->56.6%, market_speech 1/7->3/7. Also re-adjudicated the
  Hindi budget case SUMMARY->STATUS ("kaisa chal raha hai" asks
  on-track-ness — the model's answer was the better product answer).
- [x] ~~Run 26 training~~ (completed; superseded by runs 27/28) — remaining
  genuine gaps from market_speech/incomplete_data:
    "wedding" existed ONLY in GOALNAME pool, so "spent 2 lakh on the
      wedding" routed to GOAL_PLANNING — added life-event expense categories
      (the verb disambiguates once both sides are trained).
    ADD_EXPENSE never declared PERIOD — "50k rent last month" could not
      learn the trailing period span in expense contexts. Declared + 5
      {PERIODSHORT} patterns.
    DEBT_FREEDOM: +5 incomplete-data/meta variants ("estimate my payoff
      even without the interest rate" — previously routed to UNKNOWN).

- [x] **Both repos committed and pushed to new branches** — app repo
  `feature/ondevice-nlp-integration` (822d524), model repo
  `feature/v6-qa-hardening` (2616b29). Fixed two real onboarding blockers
  found while auditing: model repo's `.gitignore` had a blanket `*.json`
  rule silently excluding `period.grammar.json` (generateFromSpec.ts reads
  it — fresh clone would crash) and 4.1GB of venvs were untracked but NOT
  ignored. Added `requirements.txt` (none existed) and `ONBOARDING.md`.
  Verified by actually cloning both branches fresh and running
  generateFromSpec -> validate end to end (reproduced 15,552 rows exactly).
  Known, NOT fixed (destructive/shared-history, flagged not executed): model
  repo's `.git` carries ~500MB from a teammate's pre-session venv commit
  that was later deleted from the tree but not from history.
- [x] **qa_suite.py measurement bug fixed** — its `predict_full()` never
  applied `action_mask.json`, unlike `regression_suite.py` and the deployed
  app. Every QA number reported through run 22 (29.1% -> 46.2%) was measured
  against unmasked task predictions — inconsistent with what ships. Impact
  on run 22 was small (+0.4%, 46.2->46.6%) but the inconsistency was
  systematic and is now closed.
- [x] ~~Run 25~~ — DEPLOYED (vocab=emb=2646, 146/146 tests). Cue fixes
  cleared the floor: regression 36->39/41 (95.1%), entities 56.0% (best
  ever), QA 47.0%. Beats deployed run 22 on every gate. Remaining 2
  regression failures: the 0.48-confidence-floor case and the salary-to-EMI
  debatable — both tracked, neither a data hole.
  *(original run-25 plan follows)* — closes the
  three cue-coverage holes behind run 24's remaining regression failures:
    DEBT_FREEDOM|SUMMARY had ZERO patterns containing "plan" (RISK owned the
      word entirely) — "show my debt payoff plan" had nowhere to land. +7.
    SPENDING|INSIGHTS had only 2 patterns containing "insight" — the class's
      own cue word was barely trained. +6.
    INCOME_DECLARATION|CREATE strengthened with declaration-canonical shapes
      ("my monthly salary is {PLAINAMOUNT}") against cross-intent UPDATE
      vocabulary bleed from run 24's ADD_INCOME update forms. +5.
  Not chased: "remove my home loan" passes on label but misses the 0.5
  confidence floor at 0.48 (correct answer, 0.02 short — a calibration
  question, not a data one); "how much of my salary goes to EMI" remains the
  tracked SUMMARY/ANALYSIS debatable.
- [x] ~~Run 24~~ — write-action rebalance WORKED (all 3 UPDATE/DELETE flips
  fixed; regression 34->36/41) and QA hit 49.4% full pass — best ever
  (intent 84.2%, taskType 86.6%). Still 1 case below the 90% floor, so NOT
  deployed; run 22 remains in the app. One new collateral flip
  ("my monthly salary is 500" -> UPDATE@0.99) root-caused to shared
  vocabulary with the new ADD_INCOME update shapes.
- [x] ~~Run 23~~ — NOT DEPLOYED (regression 34/41 = 82.9%, below floor).
  Wins held elsewhere: debt_negatives 0/4 -> 3/4 (the safety-gap decoys
  worked), stacked_entity_writes 1 -> 3/10, QA taskType 74.5 -> 82.6%,
  intent 75.3 -> 78.1%. Losses: 3 write-action regressions (root-caused,
  fixing in run 24), comparisons_two_roles 56 -> 44%, entities 55.4 -> 53.1.
- [x] ~~(superseded by run-24 item)~~ Run 23 original plan — targeted
  fixes for the next tier of QA classes:
    multi_value_entities: found the taskType confusion's ROOT CAUSE — a
      near-duplicate skeleton collision (SUMMARY's "{CAT1} and {CAT2}
      spending {PERIODSHORT}" vs COMPARISON's "compare {CAT1} and {CAT2}
      spending {PERIODSHORT}" differed by exactly one word). Reworded +
      diversified PERIOD position. Added MERCHANT1/MERCHANT2 patterns
      (previously zero two-merchant training rows existed at all).
    bare_replies + market_speech: MERCHANT pool was missing Zomato/Flipkart/
      Ola/Costco entirely (all real, India-relevant, referenced by QA) and
      ASSETTYPE was missing "platinum" — QA was testing values that could
      not have been learned by construction. Widened both pools. Added
      rupee/L-abbreviated AMOUNT forms ("₹1.5L", "2L").
    stacked_entity_writes: zero CREATE patterns anywhere had 4+ distinct
      entity types; QA tests 4-5 simultaneous (amount+merchant+category+
      payment_method+date). Added a few "kitchen sink" patterns per intent.
    debt_negatives (the real safety gap): UNKNOWN had ZERO decoy patterns
      using loan/EMI/debt vocabulary, so impersonal ("how do EMIs work"),
      third-party ("my friend wants to know..."), and advice-seeking
      ("should I take a loan to invest") queries had no negative signal and
      likely misrouted to LOAN_ANALYSIS/DEBT_FREEDOM. Added 14 decoys.
  Found + fixed while regenerating: a SELF-INFLICTED leakage bug — my own
  additions reproduced 10 held-out QA utterances verbatim ("yesterday",
  "platinum", "zomato", 2 of my own decoys duplicating existing QA cases).
  Root-caused and fixed at the SOURCE rather than patched per-string: added
  a HELD_OUT_UTTERANCES guard directly in generateFromSpec.ts's dedup gates
  (both the coverage loop and short-reply loop) so no future pool widening
  can reproduce a held-out case again — matches the project's standing
  practice of closing a class of bug, not one instance of it.
  Also found: "SIP" existed in BOTH the CATEGORIES and ASSETTYPE pools — a
  genuine semantic conflict (SIP is an investment, not a spending category).
  Removed from CATEGORIES.

- [x] ~~Run 22~~ — DEPLOYED to app (vocab=emb=2639, 146/146 tests). The
  {PERIODSHORT}/{PLAINAMOUNT} deterministic-regime fix produced the largest
  single-run gain in the project: QA full pass 38.1→46.2% (band was ~30-38),
  entities 43.4→55.4% (band was ~43-48), single_period 25→61%,
  comparisons_two_roles 32→60%, debt_free 57→71%. Regression 37/41 (90.2%,
  above floor). LESSON (recorded): when a QA class fails, check which FILLER
  REGIME its utterances live in, not just whether patterns exist — pattern
  volume cannot force a sampling regime.
- [ ] **Still-red QA classes after run 22** (next targets, in value order):
  multi_value_entities 1/13 (second CATEGORY + trailing PERIOD still
  dropped in spans — likely needs I-tag/adjacency work, not more rows),
  bare_replies 1/8 (fragments still UNKNOWN — the 24-row bump was not
  enough or intent head needs the app's context-concatenation to be
  simulated in QA), commitment_semantics 0/5, debt_negatives 0/4,
  stacked_entity_writes 1/10, market_speech 1/7, ambiguity 1/6.
- [x] ~~Run 21~~ — READY TO DEPLOY (39/41 regression) but target classes
  flat: multi_value 0/13, ambiguity 0/6, bare_replies 1/8. Diagnosis was
  right, mechanism was wrong: pattern-level volume cannot force a filler
  regime. NOT deployed to app (run 20 remains deployed) — no point shipping
  a model whose targeted fixes didn't land.
- [x] Leakage false-alarm resolved: 3 "verbatim leaks" were all
  regression_suite overlap, which is BY DESIGN (in-distribution smoke suite,
  documented in validate.ts gate 9). qa/hard held-out suites: zero leaks.
  *(original run-21 item follows for the record)*
    (1) multi_value_entities 0/13: dataset had ZERO rows with two CATEGORY
        entities; now 93 via {CATEGORY1}/{CATEGORY2} patterns (numbered-slot
        fallback from iter 21 made this possible).
    (2) ambiguity_minimal_pairs 0/6 + much of single_period 6/28:
        INCOME_ANALYSIS was STEALING short spending queries ("spending last
        two months"→INCOME) because income had short noun shapes and
        spending had almost none (2 rows <=3 tokens). +10 short SUMMARY
        shapes, all leakage-checked variants.
    (3) bare_replies 0/8: short fragments were dominated by UNKNOWN (85 vs
        8-per-entity); SHORT_REPLY_COUNT 8→24 and ADD_EXPENSE gained DATE
        bare replies + about/around AMOUNT fragments. Short balance now
        ADD_EXPENSE 80 vs UNKNOWN 76.
  Success tests: multi_value >0, bare_replies >0, ambiguity pairs land on
  SPENDING, single_period above 10/28, no UNKNOWN-recall collapse (watch
  negatives_and_traps — UNKNOWN must still catch junk).

- [x] ~~Run 19~~ — current model, app synced (vocab 2624==emb, mask fresh).
  THE REAL SIP BUG WAS THE MASK: action_mask.json was hand-built in iter 18
  and never regenerated, so it FORCED SIP→SUMMARY at inference through two
  runs while training metrics said COMPARISON/WHAT_IF were learned. Fresh
  mask: both SIP cases pass. build_action_mask.py now runs inside train.py's
  export — spec-derived artifacts may never outlive a run.
- [x] ~~Regression floor~~ — CLEARED: run 20 at 40/41 (97.6%). The cue
  pass fixed 4 of 5: CASHFLOW_WARNING had NO neutral-read SUMMARY patterns
  at all (every one was worry-flavored), 2 summary-meaning patterns evicted
  from SPENDING INSIGHTS, +salary-share LOAN ANALYSIS shapes, +change-to
  ADD_INCOME UPDATE shapes. Remaining 1: "how much of my salary goes to
  EMI" → LOAN|SUMMARY@0.99 (a genuinely debatable SUMMARY/ANALYSIS line —
  tracked, not blocking).
- [ ] **QA variance reality check** — full pass 38.9→35.6→30.0 across runs
  17-19 under modest dataset changes. Run 17 was a favorable draw (it sat
  above the seed band). Honest current level: ~30-36%%. Entity exact
  44.6%%, inside the old band. Do not celebrate or panic on any single-run
  move <4pt.
- [x] ~~Run 18~~ — success tests: (a) B-EXTRAPAYMENT 0.500→0.737 ✓
  (b) prepay_what_if 6→10/25 ✓ (d) debt classes held ✓ (c) both SIP cases
  FAILED→SUMMARY (root-caused, fixed in run 19). QA 35.6% full pass /
  entities 42.3% — entity dip vs run 17 (48.6) needs the run-19 datapoint
  before judging; run 17 sat above the seed band and the dataset changed.

- [x] ~~Build `ANALYZE_INCOME` engine~~ — DONE (app repo, 2026-07-19).
  SpendingEngine parametrized with txType ('EXPENSE'|'INCOME', closed union —
  14 SQL predicates), avoiding a ~250-line duplicate engine. Dispatcher case
  ANALYZE_INCOME (SUMMARY/ANALYSIS/TREND/COMPARISON incl. single-period role
  derivation), InsightGenerator.generateIncomeAnalysisInsights (named to
  avoid colliding with the EXISTING generateIncomeInsights, a write-
  confirmation narrative with golden-fixture tests), FinanceIntent union +
  VALID_INTENTS + Layer1Intent extended, route map regenerated via codegen
  (INCOME_ANALYSIS → ANALYZE_INCOME, 19 mappings). 146/146 f5+nlp tests pass.
- [x] ~~Run 17 gates~~ — QA 38.9% full pass (96/247, best; above the seed
  band [31.6,34.0] — treat the excess cautiously, n=3 underestimates spread),
  entities 48.6%, regression 36/39 = 92.3% ≥ floor, checklist READY TO
  DEPLOY (first ever all-green).
- [ ] **SUMMARY-vs-specific taskType boundary** — all 5 remaining regression
  failures. 4 of 5: model picks a MORE specific type than the test expects
  (e.g. `SPENDING_ANALYSIS/INSIGHTS` at 0.99 conf for "show my spending
  report"). Decide per-case whether the test or the taxonomy is wrong
  BEFORE tuning the model toward the tests.
- [ ] **14 remaining un-audited intents** — per-intent taskType review done
  for SPENDING_ANALYSIS, DEBT_FREEDOM_ANALYSIS, and now effectively
  INCOME_ANALYSIS / CASHFLOW_WARNING / SAVINGS_ADVICE. Remaining 14 keep
  whatever they started with.
- [x] ~~EXTRAPAYMENT pool~~ — dedicated plausible-monthly-extra pool
  replaces the shared AMOUNTS pool (was offering "50 paisa"/"2.5 crores" as
  monthly extras). Verdict lands with run 18 gates.
- [ ] **Taxonomy gaps register** — 17 unresolved cases in
  `v6/training_pipeline/benchmarks/taxonomy_gaps.jsonl` (was 22; 5 resolved
  by INCOME_ANALYSIS + the two ANALYSIS additions). Highest value:
  `SIP_VS_PREPAY|COMPARISON` + `|WHAT_IF` now APPLIED (see run-18 item);
  20 gap cases remain, headline: NET_WORTH_CHECK|COMPARISON (needs a
  net-worth-history engine — deliberately NOT added until one exists) and
  INCOME_DECLARATION|SUMMARY (declared-income read-back; engine feasible via
  state.monthlyIncome but unwired).
- [ ] **Hard-example benchmark gap** — 60.0% vs test 95.3%. Same root shape
  as the QA gap (off-template generalization). Re-measure after retraining.

- [ ] **Run 28 training** *(in flight, seed 101, 16,176 rows)* — the
  stacked_entity_writes batch (2/10):
    CATEGORIES: +electronics/a phone/furniture (QA purchase items absent);
    TARGETDATE: +month+year deadline forms ("by December 2026" untrainable);
    ADD_INCOME write-with-date family +3 (INCOME_ANALYSIS was stealing
      "add 50000 salary income for June");
    ADD_LIABILITY stacked loan-record patterns +3 ("took a 200000 personal
      loan from HDFC at 9.5% for 5 years" routed to LOAN_ANALYSIS|WHAT_IF);
    REFUND receive-refund CREATE +2 (task flipped to DELETE).
  Also re-adjudicated 2 QA entity expectations that CONTRADICTED the grammar
  contract: "June" and "last week" as DATE — the contract (enforced by
  assertNoDatePeriodOverlap) says bare month and last-week are RANGES
  (PERIOD); those cases predate the boundary rule. Notes in the cases.
- [x] Fixed latent footgun found in passing: seed_spread.sh's restore step
  hardcoded "run16_backup" — rerunning it would have rolled the current
  model back to run 16. Now backs up/restores the CURRENT model generically,
  and archives per-seed weights.

- [ ] **Run 29 training** *(in flight, seed 101, 16,296 rows)* — the
  commitment_semantics (1/5) + risk_grade (3/9) batch:
    "EMI" REMOVED from the LIABILITYTYPE filler pool — it is a payment, not
      a liability, and taught spurious LIABILITYTYPE=emi tags in any
      EMI-containing sentence.
    DEBT_FREEDOM +20 patterns: SCHEDULE commitment vocabulary ("what EMIs
      are due", "did the EMI go out"), SUMMARY commitment-listing, WHAT_IF
      loan-closure ("if I close this loan early"), RISK subjective cues
      ("over leveraged", "under control", "worried", "healthy").
    CROSS-SUITE CONTRADICTION resolved: QA expected income-share-to-EMI ->
      DEBT_FREEDOM|RISK while regression expected the near-identical
      utterance -> LOAN_ANALYSIS|ANALYSIS. Rule now recorded in both places:
      factual share = LOAN|ANALYSIS; subjective risk judgment = DEBT|RISK.
  Success tests: commitment_semantics >2/5, risk_grade >5/9, no spurious
  LIABILITYTYPE=emi in QA failures, regression >=90% holds.

## P2 — debt / hygiene

- [ ] **Residual double-preposition rows** — 26 of 14,560 (0.18%, was 767).
  Pattern-level compositions like "over the next {PERIOD}" drawing a range
  filler ("from July to October"). Fix is a pattern lint, not a fill() change.
- [ ] **`I-TARGETAMOUNT` F1 = 0.000** (support 17) — multi-token target
  amounts never learned. Small but a real per-type hole.
- [ ] **Degenerate synonym comparisons** — 1 of 524 two-PERIOD rows pairs
  synonyms ("the current week" vs "this week"). Needs a semantic-equivalence
  check in the distinct-value draw, not just string inequality.
- [ ] **`BUDGET_PLANNING|ANALYSIS` — deliberately held.** STATUS ("am I over
  budget") vs ANALYSIS ("why am I over budget") would manufacture a new
  confusable pair while SUMMARY-vs-specific confusion is unresolved.
  Revisit after that boundary is settled. This is a decision, not an
  omission.
- [ ] **Regression baseline history** — running the suite rewrites the
  baseline in place (single generation). A change that breaks a case AND
  runs twice absorbs its own regression. Keep dated baseline copies.
- [ ] **QA expected-entity conventions** — QA scenarios write PERIOD values
  as "in May"; the model now emits "May" (preposition externalized). The
  grader's `norm()` bridges this, but the scenario file should eventually be
  normalized to the span convention so the bridge can be deleted.

## Done (evidence in change history / tracker)

- [x] **FULL PIPELINE CYCLE (iter 24)** — dataset 15,274 rows / validate
  PASS / train run 20 (seed 101) / model validation: regression 40/41
  (97.6%, floor cleared), QA 37.7%% full pass, entities 45.7%%, checklist
  READY TO DEPLOY (with the full 41-case suite — the iter-18 all-green was
  against 39) / DEPLOYED: app assets synced + codegen (19 routes), pairing
  verified vocab=emb=2648, 146/146 tests, tsc clean on touched files.
  AI_FLAGS.ENABLE_ONDEVICE_NLP remains OFF — flip is a product decision.

- [x] Fail-loud guard vindicated: assertAllSlotsHaveFillers caught
  INTERESTRATE2 having no pool at generation time (the SPLITWITH failure
  mode, stopped cold); guard taught the same numbered-slot fallback as
  fill(). Also caught: a truncated generation crash almost read as success
  because validate PASSed against the STALE previous dataset — always check
  generation output before trusting validation. *(iter 21)*
- [x] Seed-spread ruler measured (3 seeds; QA pass ±1.2pt, entity ±0.6pt,
  intent ±3.7pt, hard ±5pt). Rewrote 2 earlier conclusions (single_period
  "regression" = noise; run-16 entity 42.9% = unlucky draw). *(iter 18)*
- [x] Run 17 (seed 101) shipped as current model. *(iter 18)*
- [x] Intent-conditioned action mask (`action_mask.json` + masked argmax in
  harness predict). 4 failing regression cases adjudicated: all 4 tests
  CORRECT; 1 was a dead-route combo fixed by the mask, 3 remain honest model
  misses (cashflow SUMMARY/ANALYSIS cue, affordability/debt boundary,
  salary-to-EMI vs INCOME_ANALYSIS collision — a fresh crack from the new
  intent, expected cost, tracked). *(iter 18)*
- [x] LOAN_ANALYSIS↔DEBT_FREEDOM boundary fix — 43/45 LOAN WHAT_IF patterns
  used debt-freedom language (training two intents on one meaning); replaced
  with terms-lane patterns (rate/tenure/refinance/consolidation). Boundary
  rule written into the spec description. *(iter 17)*
- [x] DEBT_FREEDOM|SUMMARY canonical phrasings — the intent had ZERO patterns
  containing "debt free", "paid off", or "how long until". Added 18 (then
  reworded 2 the leakage gate correctly flagged as held-out QA utterances —
  the gate caught me training on the eval set). *(iter 17)*
- [x] Numbered-slot generalization — {INTERESTRATE2} would have silently
  generated nothing (only PERIOD1/2 were special-cased). Pool lookup and tag
  remapping now strip role digits generically. *(iter 17)*

- [x] TFJS export blocker — dependency-free converter, Keras-3 load,
  input_dim 2346 == vocab 2346, integrity gate PASS. *(iter 15)*
- [x] QA suite runner (`qa_suite.py`) — first end-to-end entity grading;
  247 scenarios executed. *(iter 15)*
- [x] Regression suite split 39 testable / 22 taxonomy gaps + fail-loud
  guard + expected/predicted clobber fix + utterance-keyed baseline. *(iter 15)*
- [x] `deployment_checklist.py` staleness fix — reads freshest regression
  result, rejects results older than the model. *(iter 15)*
- [x] INCOME_ANALYSIS intent (4 taskTypes, 166 seed patterns, 996 rows);
  ANALYSIS added to CASHFLOW_WARNING + SAVINGS_ADVICE (498 rows). *(iter 16)*
- [x] Per-intent filler pools (`SLOT_VALUES_BY_INTENT`) — income CATEGORY/
  MERCHANT semantics; caught before generating nonsense rows. *(iter 16)*
- [x] Preposition externalization in `fill()` — span boundaries 100%
  consistent (0/5,367 spans start with a preposition, was 30.7%); junk rows
  767 → 26. *(iter 16)*
- [x] ngrok decision recorded: remove, as part of the predict() swap
  (user-approved). *(iter 16)*
