# Pipeline Backlog

Single source of truth for what is done, in flight, and pending across the
model repo and the app repo. Rule: **nothing falls off this list silently** —
items move to Done with evidence, or stay here with a priority. The live
visual mirror is the "Task & TaskType Tracker" artifact; this file is the
durable copy that survives sessions.

Last updated: 2026-07-20 (iteration 46 — RUN 35: regression 41/41 = 100% FIRST EVER, Hinglish live, READY. App runs 34.)

## >>> WHAT IS ACTUALLY LEFT (audited 2026-07-20; 10 stale items closed) <<<

MUST DO before this can be called finished:
  A. Entity generalization — QA entities 59-63%. The umbrella P0 and the thing
     the product cares about most. Levers not yet tried: slots-head loss
     weighting, embedding capacity, CRF layer.
  B. Confirmation Card (docs/ai_chat/confirmation_card_plan.md) — ~14% of
     queries land under the confidence floor and currently dead-end.
  C. Taxonomy gaps register — 17 unresolved cases.

PRODUCT DECISIONS BLOCKING WORK (yours, not mine):
  D. Should SIP_VS_PREPAY|SUMMARY exist? An LLM told to avoid COMPARISON could
     not write 20 non-comparison queries for it.
  E. SUMMARY vs INSIGHTS vs ANALYSIS boundary — identical question shapes split
     across them at coin-flip confidence.

CAN BE CUT if time is short (hygiene, not correctness):
  F. 26 residual double-preposition rows (0.14%)
  G. I-TARGETAMOUNT F1 0.000 (support 3)
  H. 1 degenerate synonym comparison row
  I. Regression baseline history / dated copies
  J. QA expected-entity convention normalisation
  K. 14 un-audited intents — probe loop now covers these continuously, so a
     manual audit is largely redundant.

--- (original header follows) ---
Last updated: 2026-07-20 (iteration 40 — RUN 31 BEST EVER on probe metric: intent 87.7%, bucket 82.2%, QA 56.3%. (older header follows) iteration 37 — RUN 29b STAGED: all 4 success tests MET, QA 53.4%, risk_grade 3/9->7/9, zero spurious EMI tags. App still runs 28.)

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
- [ ] **Entity generalization** — the umbrella P0. DIAGNOSED PRECISELY
  2026-07-20; two cheap hypotheses TESTED AND DISPROVED, so do not retry them:
    MEASUREMENT: token F1 0.922 in-distribution (B-PERIOD 0.902, I-PERIOD
    0.931) vs QA entity-exact 59.4% off-template. That ~30pt gap is a
    GENERALIZATION problem, not coverage and not distribution.
    WHERE IT HURTS: PERIOD is 49 of ~97 QA entity issues, and "wrong" (32)
    outnumbers "missing" (14) — the model FINDS the period and mis-bounds it.
    23 of 32 are TRUNCATION: "last month"->"month", "this month"->"this",
    "between march and june"->"march and june".
    DISPROVED #1 — "the spans are not in training". They are: "last month"
    appears 60x as a complete span, "month" alone appears ZERO times.
    "between march and june" 27x, "march and june" 0x. The model is emitting
    spans it was never taught.
    DISPROVED #2 — "single-token months dominate, biasing it short".
    Multi-token spans are 67.6% of PERIOD spans (1-token 32.4%). No bias.
    WHAT REMAINS (untried, in cost order):
     1. Context diversity around spans — the same span value always appears in
        similar surrounding words; vary the frame, not the filler.
     2. Slots-head loss weighting — the span head is the weak one and trains
        against two other heads.
     3. CRF layer — structurally enforces valid BIO transitions, which is
        exactly the failure class here (orphan B-, dropped I-). Most likely to
        work, largest change, costs on-device size.
    NOTE: the model already learns boundaries well IN-distribution, so this is
    about robustness to unseen framing, not about teaching the spans again.
- [x] ~~Swap OllamaClient → IntentClassifier.predict()~~ — DONE (app repo,
  2026-07-19). OllamaClient.ts deleted (ngrok tunnel + faked 0.99 gone);
  CognitionFacade routes through IntentClassifier.predict() behind
  AI_FLAGS.ENABLE_ONDEVICE_NLP (default OFF); IntentClassifier applies
  action_mask.json in its taskType argmax; run-17 artifacts synced to
  assets/nlp (vocab 2552 == input_dim 2552, 19 intents) with 5.8MB of
  orphaned Jul-18 shards removed and app_sync.py taught to clean orphans.
  59/59 NLP unit tests pass; tsc clean on touched files.
- [x] ~~FLIP DECISION: AI_FLAGS.ENABLE_ONDEVICE_NLP~~ — FLIPPED ON by user 2026-07-20. (detail below) — the flag is the last
  gate between the model and users. Flip when QA entity exact clears a bar
  the product owner sets (currently 48.6%). Flag-off path = legacy heuristic
  EntityExtractor flow (NOT the LLM — that is gone).
- [x] ~~INCOME_ANALYSIS route~~ — resolved by the ANALYZE_INCOME engine
  (see P1 Done). The flip has no remaining structural blockers: the decision
  is now purely the QA-entity quality bar.

- [x] ~~QA intent accuracy still 64%~~ — STALE — probe intent now 91.2%. (detail below) even after the debt fix lands, watch:
  run-15 collapse concentrated in LOAN_ANALYSIS↔DEBT_FREEDOM flips at conf
  0.47–0.51. If run 16 doesn't recover it, the two intents may need merging
  (user's rule 2) rather than boundary-sharpening.

## P1 — quality

- [ ] **VERIFICATION UI — foundation DONE, UI pending** (app repo 902be42).
  Per-head confidence now flows end-to-end (IntentClassifier was already
  computing each token's tag probability and discarding it);
  `utils/ai/verification/answerVerification.ts` holds the policy as a pure,
  tested module; harness shows mode/weakest/would-ask per case.
  AI_FLAGS.ENABLE_ANSWER_VERIFICATION is OFF.
  REMAINING, in order:
   1. Run a batch through the harness and check the SILENT / VERIFY /
      REPAIR_FIRST split. The 0.8 / 0.5 / 0.7 thresholds are GUESSES — tune
      them from a real distribution before shipping, or we will nag users on
      answers that were already correct.
   2. Build the Yes/No footer + repair card widget (plan:
      app repo `docs/ai_chat/confirmation_card_plan.md`).
   3. Log every "No" + its repair as labelled production failure data — the
      highest-value output of the whole feature.
  OPEN QUESTION for review: only intent/taskType gate whether we answer; a
  weak ENTITY score never blocks. Rationale is that a wrong category still
  yields a checkable reply while a wrong intent answers a question the user
  never asked — but that is a product judgement, not a fact.

- [x] **PRODUCT DECISION MADE: Hinglish IS supported** (user, 2026-07-20).
  Implemented in run 33 (training). Measurement first: real Hinglish coverage
  was effectively ZERO. A naive grep read 1.17%, but nearly every hit was the
  currency word "paisa" inside ordinary ENGLISH rows — the marker regex now
  excludes it deliberately.
  `src/knowledge/hinglishPatterns.ts` generates Hinglish patterns per bucket.
  KEY DESIGN CHOICE: it emits PATTERNS WITH {SLOT} PLACEHOLDERS, not finished
  queries. A Hinglish pattern without placeholders would teach intent while
  DESTROYING entity extraction for that phrasing — trading one failure for
  another, the trap this project keeps rediscovering. Patterns with no slot
  are rejected outright.
  Result: 493 patterns applied across 53 buckets; dataset 16,728 -> 19,686
  rows; Hinglish coverage ~0 -> 10.7% (2,098 rows) spanning 18/19 intents,
  and 100% of them carry entity spans. Validate PASS.
  Two guards added after review caught real problems:
    - HINGLISH_MARKER check — the first sweep returned 24 plain-ENGLISH
      patterns ("Add {ASSETTYPE} worth {AMOUNT}.") that would have diluted the
      signal we were paying for. 32 rejected on the applied run.
    - undeclared-slot check — same failure mode as SPLITWITH (a slot with no
      filler pool generates nothing, silently).
  KNOWN FLAW (documented in-file, fix before next use): `--apply` REGENERATES
  before applying, so the candidate you reviewed is not the one that lands.
  Safe for now only because validate() enforces the same rules the manual
  review checked. Correct shape is a separate --apply-only.
  NOT YET MEASURABLE: the 741-row clean probe set is almost entirely English,
  so it CANNOT tell us whether Hinglish support worked. A Hinglish probe set
  is required before claiming success.
  RUN 33 RESULT — HINGLISH COST ENGLISH ENTITIES. Honest scorecard:
    probe intent   87.6 -> 90.6%  (+3.0, BEST EVER, well outside 0.8pt noise)
    probe bucket   81.6 -> 81.8%  (flat)
    QA full pass   57.5 -> 51.4%  (-6.1, well outside QA's ~2.4pt band)
    QA entities    62.9 -> 57.1%  (-5.8)
    regression     38   -> 37/41
  Vocab 2709 -> 3238 (+529 Hinglish tokens). Diagnosis: 2,098 Hinglish rows
  (10.7% of data) plus a 20% larger vocabulary spread the embedding capacity
  thinner, and the SPAN head paid for it while the INTENT head gained. That
  is a coherent story — intent is a whole-sentence decision that benefits from
  more phrasings, spans are per-token and suffer from vocabulary dilution.
  THIS IS A REAL TRADE, NOT NOISE, and it hits the thing the product cares
  about most (entity extraction). DO NOT DEPLOY RUN 33 AS-IS.
  Options, cheapest first:
   1. Reduce Hinglish share (10.7% -> ~5%) and retrain — test whether intent
      gain survives at lower dilution.
   2. Raise embedding capacity / vocab cap to absorb +529 tokens.
   3. Weight the slots-head loss to counteract span dilution.
  Measure each on BOTH the English probe set and a new Hinglish probe set —
  neither alone can see this trade.

- [x] **RUN 31 DEPLOYED to the app** (2026-07-20, app repo afbe04b) — best
  model to date: probe intent 87.7% / bucket 82.2%, QA 56.3% full pass /
  62.9% entities, regression 39/41, TFJS smoke PASS, vocab=emb=2705,
  146/146 tests.
- [x] ~~Run 32~~ — ALL THREE TARGETS IMPROVED, overall net-neutral. STAGED,
  not deployed (app runs 31).
    ADD_INCOME|UPDATE        2/7  -> 4/7
    GOAL_PLANNING|ANALYSIS   5/14 -> 10/14  (doubled)
    ADD_ASSET misroutes      9    -> 4      (52/56 intent-correct)
    QA full pass 56.3 -> 57.5% (best ever), entities 62.9% held
    probe intent 87.7 -> 87.6 (flat), bucket 82.2 -> 81.6 (-0.6, INSIDE the
    1.0pt noise band), regression 39 -> 38/41, checklist READY.
  MY PREDICTION WAS WRONG: I said these were pure coverage gaps that "should
  not trade against each other". They did trade — INCOME_ANALYSIS picked up
  15 misroutes. But the cause is NOT what I guessed either: only 3 are the
  ADD_INCOME bleed I feared, and those 3 are Hinglish. The rest are
  two-amount COMPARISON queries ("compare march 2024 salary 1.8 lakh with
  april 2024...") colliding with SIP_VS_PREPAY, whose whole shape is
  two-option comparison. That is a REAL taxonomy adjacency, not a data gap.
  FAMILY_TRANSFER->ADD_EXPENSE shows 9 but was previously measured as
  UNSTABLE across seeds (4/10/4) — do not act on this single number.
  NEXT: INCOME_ANALYSIS|COMPARISON vs SIP_VS_PREPAY adjacency is the top
  remaining item; needs a discriminator (SIP_VS_PREPAY must NAME the
  investment side — that rule already exists in the spec and may just need
  enforcing in INCOME_ANALYSIS|COMPARISON patterns).
- [x] ~~(superseded)~~ Run 32 plan — the three weakest buckets, diagnosed together and
  fixed in ONE run (they are distinct COVERAGE gaps, not boundary shifts, so
  unlike run 30 they should not trade against each other; probe_eval can
  attribute each independently afterwards):
   1. ADD_INCOME|UPDATE (2/7) — 3 of 5 failures went to INCOME_DECLARATION.
      The real discriminator is a DATE: "change 12th jan salary to 60k" edits
      one logged TRANSACTION, "my salary is 60k" declares a standing level.
      Date-anchored edit shapes were missing, so "salary" alone pulled the
      query to declaration. +7 patterns.
   2. GOAL_PLANNING|ANALYSIS (5/14) — failures scattered to BUDGET|STATUS,
      AFFORDABILITY_CHECK and DEBT_FREEDOM|SUMMARY because "am i on track" is
      STATUS vocabulary and "how long till i reach" is payoff vocabulary.
      GOAL_PLANNING owned neither, despite progress-tracking BEING the point
      of its ANALYSIS action. +12 patterns.
   3. ADD_ASSET (9 misroutes to ADD_EXPENSE/ADD_LIABILITY) — "real estate",
      "a plot", "shares", "savings bonds", startup investments were absent
      from the ASSETTYPE pool, so amount + unrecognised noun read as a
      purchase. Pool 17->23, plus DELETE/UPDATE/CREATE shapes (+11).
   NOTE: my first attempt at fix 3 asserted against a STALE copy of the
   ASSETTYPE line and failed silently-ish — the run continued and generated
   16,662 rows carrying only fixes 1+2. Caught it because the assertion
   printed a traceback while generation still reported success. Re-applied
   against the real line; final dataset 16,728 rows.

- [x] ~~FIELD REPORT: isolated run, 449 cases~~ — record, analysis complete. (detail below) (2026-07-20) — first
  UNCONTAMINATED run; see
  `benchmarks/field_reports/2026-07-20-harness-isolated-449.md`.
  Contamination 31 -> 0, so these numbers are trustworthy. Coverage 19/19
  intents, 15/15 taskTypes. HEADLINE: UNKNOWN swallows 60 of its 66 hits —
  they are answerable queries, not junk. Ranked:
    1. ALLOCATION verb family ~22 cases ("allocate 80000 across rent food
       and savings", "help me distribute 95000"). BUDGET_PLANNING declares
       ALLOCATION but the allocate/distribute/keep-for verbs are untrained.
       Cheapest large win.
    2. Loan/debt reads 7 ("what is my total outstanding loan amount",
       "is my home loan interest rate too high"). LOAN_ANALYSIS won only
       8/449 = 1.8%; genuinely weak, survived isolation.
    3. Budget reads 7 ("what budgets do i have this month").
    4. Writes 8 — incl. "salary of 85000 credited today", which only
       "worked" in the contaminated run by inheriting the prior case's
       entities. Isolation REVEALED this, did not cause it.
    5. Hinglish 9 — PRODUCT DECISION NEEDED before any work: support it
       (needs dedicated data, it is a language surface not a synonym gap) or
       assert UNKNOWN in the QA suite so it stops reading as a defect.
  Also: NAVIGATE was emitted once — a Layer1Intent with no model label and
  no action-mask entry; the app can emit an intent the mask/route map do not
  cover. Add a guard.
- [x] ~~Harness has no ground truth~~ — SOLVED by the probe loop (below).
  Probes are labelled BY CONSTRUCTION (generated one bucket at a time), so
  probe_eval.py is a measurement, not a judgement call.
- [x] ~~PROBE LOOP — the new working method (2026-07-20)~~ — built and in daily use. (detail below)
  `src/knowledge/bucketProbe.ts` + `v6/training_pipeline/probe_eval.py`.
  Replaces: generate -> TRAIN(25min) -> QA -> read failures -> repeat.
  With:     generate probes -> SCORE CURRENT MODEL(2min) -> fix only the
            confirmed-weak buckets -> train ONCE.
  Every gap we ever hit (ALLOCATION verbs, loan reads, category synonyms) was
  a coverage problem knowable without training; training was needed to FIX
  them, never to FIND them.
  Proven on BUDGET_PLANNING|ALLOCATION in ~90s, no retraining: 58.3%
  bucket accuracy, confusions BUDGET_PLANNING -> AFFORDABILITY_CHECK (x2),
  -> INCOME_DECLARATION, -> SAVINGS_ADVICE. Confirms the isolated-run finding
  that the allocate/distribute verb family is the biggest cheap win.
  Token cost: ~300 in / ~400 out per bucket; full 55-bucket sweep ~20k tokens.
  Model: gpt-oss:20b-cloud via the existing provider abstraction (worked
  first try, realistic + Hinglish). --provider openai available if needed.
  DONE: full sweep ran — 1,041 probes / 52 buckets, no retraining. See
  `benchmarks/field_reports/2026-07-20-probe-sweep-1041.md`.
  intent 83.8%, intent+taskType 72.3% (a FLOOR — probe set has label noise).
  Tooling bug found+fixed mid-sweep: num_predict 2048 truncated JSON and the
  parser discarded whole batches, losing 25/55 buckets; salvage stage + cap
  8192, re-ran the 25, 24 recovered 0 failed.
- [x] ~~Probe-set hygiene (blind relabel)~~ — `src/knowledge/probeRelabel.ts`
  re-asks the LLM to classify its own queries BLIND (full taxonomy, no hint of
  the source bucket) and quarantines disagreements rather than deleting them
  (a disagreement is evidence about the TAXONOMY too). 1,041 -> 741 clean /
  300 disputed (29% label noise). Rescoring on the clean set moved
  intent 83.8 -> 87.2% and bucket 72.3 -> 81.1%: NINE POINTS of apparent
  model failure was actually label noise. Most-disputed buckets are a
  taxonomy signal in their own right: SIP_VS_PREPAY|SUMMARY 20/20 disputed,
  DEBT_FREEDOM|SCHEDULE 20, DEBT_FREEDOM|SUMMARY 19, INCOME_DECLARATION|
  UPDATE 18 — buckets an LLM cannot reliably separate from their siblings.
- [x] **PROBE SET IS THE BETTER RULER** — seed-repeat measured its noise at
  intent range 0.8pt / bucket 1.0pt across 3 seeds, versus the QA suite's
  +/-3.7pt intent band. 741 labelled rows beats 247. Use probe_eval deltas
  for decisions; QA-suite deltas under ~4pt remain meaningless.
- [~] **RESOLVED-WITH-TRADEOFF: direction-confusion cluster** — seed-repeat
  (3 seeds on the run-30 dataset) settles it:
    intent  86.5% mean (range 0.8) vs 29b 87.2%  -> 29b above ALL 3 seeds
    bucket  80.4% mean (range 1.0) vs 29b 81.1%  -> 29b above ALL 3 seeds
    DIRECTION ERRORS 15.3 mean (16/17/13) vs 29b 20 -> ALL 3 seeds below
  Verdict: the fix WORKED on its target (~23% fewer direction errors, outside
  noise) but TRADED — roughly 5 direction errors fixed, ~4 new errors created
  elsewhere (GOAL_PLANNING->AFFORDABILITY_CHECK, ADD_LIABILITY->ADD_EXPENSE,
  BUDGET_PLANNING->SPENDING_ANALYSIS). Net accuracy ~0.7pt down, errors
  RELOCATED from the highest-stakes category (wrong-signed transactions on
  write intents) to read-path misroutes. That is a defensible trade but a
  JUDGEMENT CALL, not a clear win — flagged for the product owner rather than
  decided silently.
  CAUTION: FAMILY_TRANSFER->ADD_EXPENSE is unstable across seeds (4/10/4) —
  do not read a single measurement of it.
- [~] ~~(superseded)~~ direction-confusion cluster — run 30 result is MIXED, not
  a win. Targeted pairs improved: ADD_INCOME->ADD_EXPENSE 7->5,
  FAMILY_TRANSFER->ADD_INCOME 7->4. But overall moved DOWN slightly
  (intent 87.2->86.0, bucket 81.1->80.8) — WITHIN the measured +/-3.7pt intent
  noise band, so neither the gains nor the drop are individually conclusive.
  New confusions appeared (classic seesaw): GOAL_PLANNING->AFFORDABILITY_CHECK
  5, ADD_LIABILITY->ADD_EXPENSE 4, BUDGET_PLANNING->SPENDING_ANALYSIS 3,
  ADD_INCOME->INCOME_DECLARATION 3.
  Standing gates HELD: regression 39/41 (95.1%), QA 52.6% full pass / 59.4%
  entities, checklist READY. Run 30 is not worse on anything that gates.
  Remaining ADD_INCOME failures are DIFFERENT shapes than before, and some are
  debatable labels, not defects: "correct my salary income to 50k" ->
  INCOME_DECLARATION is arguably RIGHT; "add 5k from amazon return" is
  arguably REFUND. The no-merchant shapes are the real残 gap:
  "1 lakh credited 10-08 via UPI", "got paid 1.2 lakh 22-11 through phone pe"
  (PhonePe read as a payee).
  NEXT: needs a seed-repeat before any further conclusion — a single run
  cannot separate a 1.2pt move from noise.
- [x] ~~SPENDING_ANALYSIS|ANALYSIS~~ — FIXED in run 31 by the re-diagnosis.
  Target bucket 4/9 (44.4%) -> 8/9 (88.9%), and unlike run 30 this ADDED
  accuracy instead of trading: intent 86.5 -> 87.7%, bucket 80.4 -> 82.2%,
  both BEST EVER and outside the 0.8pt probe noise band. Direction cluster
  held at 15 (vs 29b 20). Lesson: 4 iterations of adding "analyze" patterns
  did nothing because the taskType was never wrong; 12 bill/fee/charge NOUN
  patterns aimed at the intent head doubled the bucket in one run. When a
  fix fails twice, re-read WHICH HEAD is failing before increasing the dose.
  *(original diagnosis retained below)*
- [x] **SPENDING_ANALYSIS|ANALYSIS — RE-DIAGNOSED, my earlier hypothesis was
  WRONG.** For 4 iterations I treated this as "Analyze does not map to the
  ANALYSIS taskType" and kept adding analyze-cue patterns. It never moved.
  The probe set shows why: bucket accuracy 44.4% EQUALS intent-alone 44.4%,
  i.e. the taskType is correct in every single case (ANALYSIS 9/9) and every
  failure is an INTENT miss. I was aiming at the wrong head.
  Real split, from all 9 probes:
    PASS: "grocery EXPENSES", "grocery SPEND", "food SPENDING" (explicit
          spend-word present)
    FAIL: "cable BILL jump" -> INCOME_ANALYSIS, "gas BILL increase" ->
          INCOME_ANALYSIS, "netbank FEE spike" -> INCOME_ANALYSIS,
          "cafe ORDERS" -> SAVINGS_ADVICE
  Two compounding causes:
   (a) BILL/FEE/CHARGE/ORDER nouns are nearly absent from
       SPENDING_ANALYSIS|ANALYSIS — only 3 of 54 patterns use them, even
       though the app's own categories are literally "Electricity Bill",
       "Water Bill", "Gas Bill", "Credit Card Bill".
   (b) jump/spike/increase IS well covered (18/54) but is also
       INCOME_ANALYSIS|TREND vocabulary, so with no spend-noun to anchor it
       the query drifts to income.
  FIX (prepared, deliberately NOT applied yet): bill/fee/charge-noun ANALYSIS
  patterns. HELD because a seed-repeat is training off the current
  spec_dataset.jsonl — regenerating mid-run would train seeds 202/303 on
  different data than run 30 and void the noise comparison.
- [ ] ~~(superseded)~~ direction-confusion cluster (from probe sweep) — the model
  knows the domain but not WHICH WAY money moves:
    ADD_INCOME -> ADD_EXPENSE (12), FAMILY_TRANSFER -> ADD_INCOME (8),
    DEBT_FREEDOM -> ADD_LIABILITY (8), ADD_ASSET -> ADD_LIABILITY (4).
  "add 7500 from zara store" and "4000 cr from client" both -> ADD_EXPENSE:
  the model keys on merchant presence over the direction verb
  (got/received/credited vs spent/paid). Highest-traffic write path, and a
  wrong call writes a transaction with the WRONG SIGN. One targeted
  direction-verb pattern family should address all four confusions.
- [x] ~~Probe-set hygiene (blind relabel)~~ — probeRelabel.ts built + run (29% noise found). (detail below) — SIP_VS_PREPAY|SUMMARY scored
  0/20 with intent accuracy 100%: the LLM generated comparison-shaped queries
  ("SIP karun ya loan prepay?") and labelled them SUMMARY because we asked
  for SUMMARY. The model was RIGHT. Fix: re-ask the LLM to label its own
  queries blind and drop rows where the label disagrees with the requested
  bucket. Until then, where intent accuracy is HIGH but bucket accuracy LOW,
  suspect the label before the model.
- [ ] **PRODUCT: should SIP_VS_PREPAY|SUMMARY exist?** An LLM explicitly told
  to avoid COMPARISON could not write 20 non-comparison queries for it. If
  the intent is inherently comparative we may be training the model to fail.
- [ ] ~~(superseded)~~ Harness ground-truth note — records what the model said, never
  what it should have said, so NO accuracy figure is computable from any run;
  all findings are inspection-based judgement. Highest-value harness change:
  accept `query | EXPECTED_INTENT | EXPECTED_TASKTYPE` and self-grade, so a
  batch yields a real pass/fail number and failures flow into
  qa_scenarios.jsonl.
- [x] ~~Harness cross-case contamination~~ — FIXED (app repo fe30b45).
  CognitionFacade prepends any open clarification to the next utterance;
  the harness shared one conversation store across cases, so 31 cases
  carried entities from a preceding case. Isolated mode (default ON) clears
  pendingConversation + lastContext per case; state is stamped into the
  report header and JSON. METHOD LESSON: the markdown groups cases by
  intent, so file-order is NOT execution-order — my first leak-detection
  pass compared against the wrong neighbour.

- [x] ~~FIELD REPORT: harness run 1~~ — record, analysis complete. (detail below) (2026-07-20, run 29b model) — full
  analysis in `v6/training_pipeline/benchmarks/field_reports/2026-07-20-harness-run-1.md`.
  Suite tested ~5% of the product (36/40 SPENDING_ANALYSIS, 3 of 15
  taskTypes) so it says little about overall quality, but it surfaced real
  bugs. Priority order, NOT yet actioned (user asked for analysis only):
    1. SILENT WRONG-PERIOD ANSWERS — PERIOD dropped, app substitutes TODAY,
       user gets a confident answer about the wrong time range. 5/40 (12.5%).
       Weak shape is merchant-then-period. Trace the today-fallback first.
    2. Category synonym gaps where the app category EXISTS: "gas stations"
       (Fuel), "Wifi" (Internet / Broadband), "coffee" (Tea & Coffee).
       Cheap training-data fix.
    3. Informal spend verbs: "blow on" -> INCOME_ANALYSIS, "drop on" ->
       UNKNOWN@0.00.
    4. "Analyze"/"analysis" never maps to ANALYSIS taskType (0 for 3; one at
       1.00 confidence).
    5. SUMMARY/INSIGHTS/ANALYSIS boundary: identical question shape split
       INSIGHTS@0.49 vs ANALYSIS@0.50 — needs a PRODUCT decision.
    6. Span swallowing: "spent on Uber yesterday" -> DATE="uber yesterday",
       merchant lost. Hallucinated category "Clothing" on a query with no
       category. Both need tracing.
  Every item must become a qa_scenarios.jsonl case even if not fixed now.
- [x] ~~Query-generation prompt written~~ — written and used for 4 batches. (detail below) —
  `~/Downloads/TestSuites/QUERY_GENERATION_PROMPT.md` hands the generating
  model the full 19-intent/15-taskType taxonomy, real category + merchant
  vocabulary, Indian money/time formats, and an explicit coverage
  requirement. Root cause of batch 1's narrowness: the generator had no idea
  what the app could do.

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
- [x] ~~Archive per-run .h5 weights~~ — train.py archives the full export
  per run (newest 10, gitignored). THE FIRST PLACEMENT WAS ITSELF A BUG: the
  block sat BEFORE model.save() and crashed on a shadowed local `import
  shutil` (UnboundLocalError), killing run 29 mid-export — exported_model
  held run-29 vocab over run-28 weights and every harness scored
  near-random (QA 4.9%, intent 15.8%). Caught by the gates before staging;
  export restored from the *-run28-DEPLOYED archive (the archive rescuing
  us from its own bug). Block now sits AFTER the final banner with a
  keep-this-last comment; the shadowing import removed. Launcher lesson:
  `; echo EXIT $?` masks failure from the task harness — run the command
  bare so its exit code propagates.

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
- [x] ~~Still-red QA classes after run 22~~ — STALE — superseded by probe-loop per-bucket data. (detail below) (next targets, in value order):
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
- [x] ~~QA variance reality check~~ — DONE — seed spread measured (probe 0.8pt, QA 3.7pt). (detail below) — full pass 38.9→35.6→30.0 across runs
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

- [x] ~~Run 28 training~~ — completed. (detail below) *(in flight, seed 101, 16,176 rows)* — the
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

- [x] ~~Run 29b~~ — STAGED (not deployed; user-request rule). ALL FOUR
  success tests met: commitment_semantics 1->2/5 (>1 ✓), risk_grade
  3/9->7/9 (>5 ✓), spurious LIABILITYTYPE=emi failures 0 ✓, regression
  92.7% (>=90 ✓). QA 51.4->53.4%, taskType 84.2%, entities 60.0%.
  Export coherence verified BEFORE scoring (all artifacts within 1s,
  archive written, TFJS smoke PASS) — the check that would have caught the
  run-29 corruption immediately.
  *(original plan below)* — the
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

- [~] **Shared-pool audit** — done systematically; run 37 measuring.
  Method: cross-reference IDENTICAL filler values against per-type F1, so only
  collisions that actually HURT get fixed. Found and fixed:
    B-LUMPSUM f1 0.111 / recall 0.059 — the worst tag in the model. 8 of its
      10 values also appeared as DOWNPAYMENT ("2 lakh", "200000", "5 lakhs",
      "50000"), AMOUNT or TARGETAMOUNT, so it had almost no unique signal.
      Rebuilt as odd-magnitude windfall values.
    B-LENDER f1 0.578 / recall 0.433 — shared its two most generic values with
      other slots ("my friend" with SPLITWITH, "the bank" with ADD_INCOME's
      MERCHANT pool). Lenders are now INSTITUTIONS; informal person-lending is
      FAMILY_TRANSFER's territory.
  PERMANENT GUARD ADDED: assertNoSlotValueCollisions() fails generation when
  two slots DECLARED BY THE SAME INTENT share filler values. Only same-intent
  overlap is an error — cross-intent sharing is harmless. It caught a
  collision I had missed on its very first run (TARGETAMOUNT/AMOUNT both
  containing "1000000" in GOAL_PLANNING).
  WHY A HARD GATE: this defect has now appeared THREE times (EXTRAPAYMENT
  0.500->0.737, TARGETAMOUNT 0.148->0.857, LUMPSUM 0.111->?) and each time was
  found only after a training run plus a per-type F1 investigation. It is
  invisible to every count-based gate — rows, diversity and validation all
  pass happily while the NER head is being taught two labels for one string.
- [ ] **FREQUENCY tags weak** (I-FREQUENCY f1 0.000 n=2, B-FREQUENCY 0.286
  n=6) — very low support, so this may be a sample-size artefact rather than a
  real defect. Measure support before treating it as a bug.


- [ ] **Residual double-preposition rows** — 26 of 14,560 (0.18%, was 767).
  Pattern-level compositions like "over the next {PERIOD}" drawing a range
  filler ("from July to October"). Fix is a pattern lint, not a fill() change.
- [~] **`I-TARGETAMOUNT`** — ROOT-CAUSED and fixed in run 36 (training).
  Still broken on run 35 and the WORST entity in the model:
  B-TARGETAMOUNT f1 0.590 / recall 0.419, I-TARGETAMOUNT f1 0.148 /
  recall 0.080 — while its own siblings were fine (GOALNAME 0.939,
  TARGETDATE 0.923), which is what localised it.
  CAUSE: `TARGETAMOUNT: AMOUNTS` — the SAME pool as AMOUNT, and GOAL_PLANNING
  declares BOTH slots. 41 identical values ("45.50", "roughly 500", "10 lakhs")
  were labelled as each type inside the same intent, so only context could
  separate them and context alone was not enough. IDENTICAL to the
  EXTRAPAYMENT bug (0.500 -> 0.737).
  FIX: dedicated goal-shaped pool (large, round, savings-ambition amounts).
  Overlap with AMOUNT 41 -> 1; multi-token share 71% — deliberate, since
  I-TARGETAMOUNT can only be learned from spans that HAVE a continuation.
  LESSON (now twice): two slots sharing a filler pool inside one intent is a
  structural defect. Audit the remaining shared pools.
- [ ] ~~(old)~~ `I-TARGETAMOUNT` F1 = 0.000 (support 17) — multi-token target
  amounts never learned. Small but a real per-type hole.
- [ ] **Degenerate synonym comparisons** — 1 of 524 two-PERIOD rows pairs
  synonyms ("the current week" vs "this week"). Needs a semantic-equivalence
  check in the distinct-value draw, not just string inequality.
- [ ] **`BUDGET_PLANNING|ANALYSIS` — deliberately held.** STATUS ("am I over
  budget") vs ANALYSIS ("why am I over budget") would manufacture a new
  confusable pair while SUMMARY-vs-specific confusion is unresolved.
  Revisit after that boundary is settled. This is a decision, not an
  omission.
- [x] ~~Regression baseline history~~ — regression_suite.py now snapshots the
  OUTGOING baseline to benchmarks/baseline_history/ before overwriting (newest
  20 kept). The baseline was a single generation, so running the suite twice
  made a newly-broken case look "always broken" and consumed its own signal —
  which already bit us on 2026-07-19 when 3 genuine regressions had to be
  reconstructed from a backup. Verified: snapshot written, suite still 41/41.
- [ ] ~~(old)~~ Regression baseline history — running the suite rewrites the
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
