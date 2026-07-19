# Model Deployment Checklist

How to ship a new on-device NLP model to `wealthpilot_native_app`, and how to
roll back if something's wrong after the fact. See
`docs/ai_chat/on_device_nlp_implementation_roadmap.md` (in the app repo) for
the full multi-phase context this checklist is Phase 4's deliverable for.

## Before you ship

1. Run the full pipeline: `./run_pipeline.sh --app /path/to/wealthpilot_native_app`
   This runs, in order: generate → validate (hard gate) → manifest → regression-suite
   build → codegen (local + app) → train → export → hard-example benchmark →
   regression check → export integrity check → app binary sync.
2. Run the checklist explicitly to get a single pass/fail readout:
   ```
   cd v6/training_pipeline
   python deployment_checklist.py exported_model /path/to/wealthpilot_native_app
   ```
3. **If any check fails, do not promote.** Fix the underlying issue and re-run
   from step 1 — every check corresponds to a real gate earlier in the
   pipeline; skipping straight to a manual copy defeats the whole point.
4. `codegenApp.ts` writes `labels.generated.json` and
   `intentRouteMap.generated.ts` into the app repo. **Diff these against the
   currently-live files by hand before overwriting** — intent index ordering
   is index-sensitive to the trained model's output layer, and a silent
   reorder would misroute every prediction. `app_sync.py`'s binary artifacts
   (tfjs weights, vocabulary.json, category_mapping.json) don't need this
   review step — there's no meaningful "diff" of a weight tensor, and the
   export integrity check already refuses to sync a mismatched pairing.
5. Once you've reviewed and are satisfied, promote:
   ```
   mv assets/nlp/labels.generated.json assets/nlp/labels.json   # (in the app repo)
   ```
   (`app_sync.py` already wrote the binary artifacts directly — nothing to
   promote there, they're already live once the sync step completes.)

## What each checklist gate actually catches

| Gate | Fails when | Real incident it would have caught |
|---|---|---|
| Dataset manifest | No versioned manifest for the dataset that trained this model | Untraceable dataset provenance — see Phase 1's finding that the previously-deployed model's training data no longer existed in this repo |
| Dataset validation gate | `validate.ts` didn't pass (coverage, conflicting labels, invalid combos, diversity floor, bucket balance) | A dataset with a 357x class imbalance or 16-form AMOUNT entity, both found in the original architecture review |
| Evaluation report | Intent accuracy below the configured floor | Shipping a model that's regressed without anyone noticing until a user complains |
| Hard-example benchmark | Fails on the documented failure classes (bare replies, ambiguous intents, live-log bugs, corrections, out-of-domain, code-switch) | The exact ADD_ASSET clarification-loop bug (backlog #5) — this benchmark includes its literal reproduction case |
| Regression suite | A canonical utterance that previously classified correctly now doesn't | Silent regressions across training runs that in-distribution test accuracy alone wouldn't surface |
| Export integrity | vocabulary.json / labels.json / model.json aren't mutually consistent | The exact bug found during Phase 1: a stale `vocabulary.json` (4578 words) paired with a model whose embedding layer only had `input_dim: 3580` — would have crashed or corrupted inference on ~1000 words' worth of vocabulary |
| App-side artifacts | The already-deployed `assets/nlp/` directory (post-sync) fails its own integrity check | Confirms the sync itself didn't introduce a mismatch |

## Rollback

There is no separate rollback mechanism to maintain — rollback is just
re-running the sync from a prior dataset/model manifest version:

1. Find the manifest version you want to roll back to:
   `ls exported_dataset/manifests/`
2. Check out the specs at that point (`git log --oneline -- src/knowledge/specs/`,
   find the commit matching that manifest's `gitCommit` field), regenerate,
   retrain, and re-export — the pipeline is fully deterministic (same seed →
   same dataset bytes), so this reproduces the exact prior model.
3. Alternatively, if you kept the prior `exported_model/` directory around
   (recommended: don't delete it until the new one has been live for a
   while), just re-run `app_sync.py` pointing at that old directory instead
   of retraining.

No manual asset surgery, no "which file goes where" — the same two scripts
(`codegenApp.ts` + `app_sync.py`) that do a forward deploy also do a rollback,
just pointed at older artifacts.

## Ownership boundary (who writes what)

- `src/knowledge/codegenApp.ts` → `wealthpilot_native_app/assets/nlp/labels.generated.json`,
  `wealthpilot_native_app/utils/ai/nlp/intentRouteMap.generated.ts`
- `v6/training_pipeline/app_sync.py` → `wealthpilot_native_app/assets/nlp/{vocabulary.json,category_mapping.json,tfjs/*}`
- **Nothing else should ever write into `wealthpilot_native_app/assets/nlp/` or
  `wealthpilot_native_app/src/ai/model/assets/`.** The latter directory is a
  confirmed-stale, unused duplicate (Phase 1 finding) — do not resurrect it as
  a sync target.
