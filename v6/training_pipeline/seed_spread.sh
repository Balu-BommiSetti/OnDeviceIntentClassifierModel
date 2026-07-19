#!/bin/bash
# Seed-spread experiment (BACKLOG P0: run-to-run variance).
#
# Trains the IDENTICAL dataset under 3 seeds and records per-seed eval + QA
# reports. The spread is the error bar for every single-run comparison the
# pipeline has ever made. Run 16's artifacts are backed up first and restored
# after, so the "current model" is unchanged by the experiment.
set -e
cd "$(dirname "$0")"
OUT=benchmarks/seed_spread
mkdir -p "$OUT"

# Preserve the CURRENT model, whatever run it is. (Was hardcoded
# "run16_backup" from the first use — rerunning later would have restored
# run 16 over the then-current model.)
rm -rf "$OUT/current_backup"
cp -R exported_model "$OUT/current_backup"

for SEED in 101 202 303; do
  echo "=== SEED $SEED: training ==="
  SEED=$SEED ./.venv/bin/python train.py
  ./.venv/bin/python convert_tfjs.py
  ./.venv/bin/python qa_suite.py || true
  cp exported_model/eval_report.json "$OUT/eval_seed${SEED}.json"
  cp benchmarks/qa_report.json "$OUT/qa_seed${SEED}.json"
  # Archive the WEIGHTS too. First run archived only reports, so the
  # best-scoring seed's model was overwritten and — with TF op-level
  # nondeterminism — a same-seed rerun is a fresh draw, not a reproduction.
  rm -rf "$OUT/model_seed${SEED}"
  cp -R exported_model "$OUT/model_seed${SEED}"
  echo "=== SEED $SEED: done ==="
done

# Restore the pre-experiment model (the experiment measures, it does not ship)
rm -rf exported_model
cp -R "$OUT/current_backup" exported_model

echo "ALL SEEDS DONE"
