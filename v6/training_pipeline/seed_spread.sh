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

# Preserve the current (run 16) model
rm -rf "$OUT/run16_backup"
cp -R exported_model "$OUT/run16_backup"

for SEED in 101 202 303; do
  echo "=== SEED $SEED: training ==="
  SEED=$SEED ./.venv/bin/python train.py
  ./.venv/bin/python convert_tfjs.py
  ./.venv/bin/python qa_suite.py || true
  cp exported_model/eval_report.json "$OUT/eval_seed${SEED}.json"
  cp benchmarks/qa_report.json "$OUT/qa_seed${SEED}.json"
  echo "=== SEED $SEED: done ==="
done

# Restore run 16 as the current model (the experiment measures, it does not ship)
rm -rf exported_model
cp -R "$OUT/run16_backup" exported_model

echo "ALL SEEDS DONE"
