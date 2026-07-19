# Onboarding — on-device intent model pipeline

Start here. `README.md` describes the **retired V4/V3** generators and a
`training_pipeline/` path that is no longer the live one; the current pipeline
is `src/knowledge/` (dataset) + `v6/training_pipeline/` (training). This file
covers the live path only.

## What this repo produces

A multi-task TFJS model (intent / taskType / BIO entity spans) that ships into
`wealthpilot_native_app` at `assets/nlp/`. Everything is generated from one
source of truth: the intent specs.

```
src/knowledge/specs/*.intent.json     ← SOURCE OF TRUTH. Edit these.
        │
        ├─ generateFromSpec.ts  → exported_dataset/spec_dataset.jsonl
        ├─ validate.ts          → hard quality gates (leakage, diversity, …)
        └─ codegenApp.ts        → app's intentRouteMap.generated.ts + labels
                                    │
v6/training_pipeline/train.py ──────┘
        ├─ build_action_mask.py  (auto, at export)
        ├─ convert_tfjs.py       → exported_model/tfjs/
        ├─ qa_suite.py           → 247 hand-written scenarios (the real bar)
        ├─ regression_suite.py   → 41 in-distribution smoke cases
        ├─ deployment_checklist.py → single READY/NOT-READY readout
        └─ app_sync.py           → copies artifacts into the app repo
```

## Setup

```bash
# 1. Node side (dataset generation, codegen)
npm install

# 2. Python side (training). Python 3.11 required.
cd v6/training_pipeline
python3.11 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

**`npx tsx` is broken in this repo** (esbuild binary mismatch). Use the
wrapper instead — it compiles with tsc, fixes ESM extensions, and cleans up
only its own artifacts:

```bash
./scripts/run-ts.sh src/knowledge/validate.ts
```

## The loop you will actually run

```bash
# 1. edit a spec, then regenerate + validate (validate is a HARD gate)
./scripts/run-ts.sh src/knowledge/generateFromSpec.ts
./scripts/run-ts.sh src/knowledge/validate.ts

# 2. train (~15-25 min; SEED is overridable, default 42)
cd v6/training_pipeline
SEED=101 ./.venv/bin/python train.py

# 3. validate the MODEL (not the data)
./.venv/bin/python qa_suite.py            # the number that matters
./.venv/bin/python regression_suite.py exported_model
./.venv/bin/python deployment_checklist.py

# 4. deploy — only if the checklist says READY TO DEPLOY
./.venv/bin/python app_sync.py /path/to/wealthpilot_native_app
cd ../.. && WP_APP_DIR=/path/to/wealthpilot_native_app \
  ./scripts/run-ts.sh src/knowledge/codegenApp.ts
```

## Five things that will bite you

1. **Test-set accuracy is not the score.** It is measured on held-out rows
   built from the *same templates* as training (~94%). The honest number is
   `qa_suite.py` — hand-written, off-template (46.2% full pass, 55.4% entity
   exact as of run 22). Never quote the first when you mean the second.

2. **Single-run deltas below ~3pt are noise.** Measured across 3 seeds on an
   identical dataset: QA full pass ±1.2pt, entity ±0.6pt, but QA *intent*
   ±3.7pt and the hard-example benchmark ±5pt. `benchmarks/seed_spread/` has
   the raw data. Do not celebrate a 2-point move.

3. **Check the filler REGIME, not just pattern count.** The biggest single
   gain in the project (QA 38→46%) came from realising that adding patterns
   could not help when the fillers never sampled the regime under test —
   `my spending {PERIOD}` kept generating "July through October", never "last
   month". `{PERIODSHORT}` / `{PLAINAMOUNT}` exist to force a regime; they
   alias back to PERIOD / AMOUNT via `SLOT_TYPE_ALIASES`.

4. **Spec-derived artifacts must never outlive a run.** A hand-built
   `action_mask.json` once forced `SIP_VS_PREPAY` → SUMMARY at inference for
   two full training runs *while training metrics said the new buckets were
   learned*. It now regenerates inside `train.py`'s export step. The app must
   apply the same mask — `IntentClassifier.ts` does.

5. **Inspect rows, not counts.** Several bugs (a slot with no filler pool
   producing zero rows for 92 patterns; income patterns generating "earn from
   groceries") passed every count-based gate. `assertAllSlotsHaveFillers` and
   the per-intent filler pools exist because of those.

## Two intents, one meaning — the recurring taxonomy trap

Adding a taskType is cheap; making two intents mean the same thing is
expensive. `LOAN_ANALYSIS|WHAT_IF` once had 43 of 45 patterns using
debt-freedom language, so every retrain re-flipped that boundary at random.
The rule now, written into the spec descriptions:

- `LOAN_ANALYSIS` owns loan **terms** (rate, tenure, refinance, consolidation)
- `DEBT_FREEDOM_ANALYSIS` owns **freedom** (payoff date, extra payments, lump sums)
- `SIP_VS_PREPAY` patterns must **name the investment side**, or they belong to
  DEBT_FREEDOM

## Current state

`BACKLOG.md` is the live task list — read it before picking up work. It
carries priority, evidence for what is done, and the reasoning behind
decisions that look like omissions (e.g. `BUDGET_PLANNING|ANALYSIS` is held
deliberately, not forgotten).

The app-side flag `AI_FLAGS.ENABLE_ONDEVICE_NLP` is **OFF**: artifacts ship,
but users are still on the legacy heuristic path. Flipping it is a product
decision gated on QA entity quality.
