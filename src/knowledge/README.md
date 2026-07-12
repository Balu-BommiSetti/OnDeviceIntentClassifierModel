# Intent Knowledge Specs — the single source of truth

Every intent WealthPilot understands is defined by **one file** in [`specs/`](./specs).
The training dataset, the on-device model's `labels.json`, and the app's
`INTENT_ROUTE_MAP` are all **generated** from these specs — nothing in the
taxonomy is hand-maintained in more than one place.

> Replaces the old procedural generator (`src/generators/DatasetGenerator.ts`
> and `src/templates/*`), which has been removed. That generator produced ~8.9M
> rows where the same sentence carried up to 12 conflicting labels (78% of rows
> in conflict). This pipeline produces a small, deduped, validated dataset where
> every (intent, action) pair is business-valid.

## Quick start

**Everything in one command** — generate → validate → codegen → train → TF.js export
(run from the repo root):

```bash
./run_pipeline.sh                 # full run incl. model training
./run_pipeline.sh --no-train      # data pipeline only (generate → codegen)
./run_pipeline.sh --app /path/to/wealthpilot_native_app   # also emit app artifacts
```

The validate step is a **hard gate**: a dataset that fails any check aborts the run
*before* training. The script auto-runs `npm install` and sets up the Python venv.

**Data pipeline only** (no training):

```bash
npm install
npm run dataset:build     # generate -> validate -> codegen (fails if any gate fails)
```

Individual steps:

| Command | What it does |
|---|---|
| `./run_pipeline.sh` | **Full end-to-end**: data pipeline + Python training + TF.js export |
| `npm run dataset:generate` | Reads `specs/*.intent.json` → writes `exported_dataset/spec_dataset.jsonl` (deterministic; same seed → identical bytes) |
| `npm run dataset:validate` | The quality gate. **Exits non-zero** on any violation (see below) |
| `npm run dataset:codegen` | Writes `exported_dataset/generated/labels.generated.json` + `routeMap.generated.json` |
| `npm run dataset:codegen:app` | Writes those artifacts INTO the app repo. Requires `WP_APP_DIR=/path/to/wealthpilot_native_app` |
| `npm run dataset:build` | generate → validate → codegen (no training) |

Training (`training_pipeline/train.py`) reads `exported_dataset/spec_dataset.jsonl`.

## What a spec looks like

See [`knowledge.schema.json`](./knowledge.schema.json) for the full contract. In brief:

```jsonc
{
  "intent": "ADD_EXPENSE",
  "supported_actions": ["CREATE","UPDATE","DELETE","SUMMARY","ANALYSIS"], // valid actions ONLY
  "required_entities": ["AMOUNT"],
  "optional_entities": ["MERCHANT","CATEGORY","DATE","PAYMENT_METHOD"],
  "backend_route": "LOG_TRANSACTION",   // app ActionDispatcher action
  "advisory_intent": "RECORD_EXPENSE",  // app f5 FinanceIntent (INTENT_ROUTE_MAP target)
  "validation": { "min_distinct_utterances_per_action": 20 },
  "utterance_patterns": {               // distinct phrasings PER action
    "CREATE":  ["spent {AMOUNT} on {CATEGORY}"],
    "SUMMARY": ["show my logged {CATEGORY} expenses {DATE}"]
  }
}
```

**Design rule that keeps business logic intact:**
- *Transaction intents* (`ADD_EXPENSE`, `ADD_INCOME`, `REFUND`, `ADD_ASSET`,
  `ADD_LIABILITY`, `INCOME_DECLARATION`, `FAMILY_TRANSFER`) write data → support
  `CREATE/UPDATE/DELETE/SUMMARY`, carry a `LOG_*`/`ADD_*` route.
- *Advisory intents* (`SPENDING_ANALYSIS`, `LOAN_ANALYSIS`, …) are read-only →
  support analysis-family actions only. They must **never** emit `CREATE`.

## The validation gate rejects a build if…

1. An intent in a spec produced **no** rows (incomplete coverage)
2. A row's intent isn't in the taxonomy
3. The **same utterance** carries **two different labels** (conflict)
4. An **(intent, action)** pair isn't declared in that intent's `supported_actions`
5. Any action has **fewer distinct utterances** than its `min_distinct_utterances_per_action`

## Adding or changing an intent

1. Edit / add a `specs/<INTENT>.intent.json` (validated against `knowledge.schema.json`).
2. `npm run dataset:build` — fix anything the gate flags.
3. `WP_APP_DIR=… npm run dataset:codegen:app` to regenerate app artifacts.
4. **Retrain** the model (`training_pipeline/train.py`) before the app can predict a *new* intent —
   `labels.json` maps output neurons to names, so a new intent needs a new neuron.

## Files

```
knowledge/
  specs/*.intent.json     # 17 intents — the source of truth
  knowledge.schema.json   # the spec contract
  index.ts                # loader + allIntents/allActions/validCombos
  generateFromSpec.ts     # deterministic, action-specific generator
  validate.ts             # the quality gate
  codegen.ts              # emits labels + route map (local)
  codegenApp.ts           # emits them INTO the app repo (needs WP_APP_DIR)
  rng.ts                  # seeded PRNG (reproducibility)
```
