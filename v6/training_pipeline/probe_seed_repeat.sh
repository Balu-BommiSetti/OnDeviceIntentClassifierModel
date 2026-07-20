#!/bin/bash
# Seed-repeat on the CURRENT dataset, scored against the clean probe set.
# Answers one question: is a direction-confusion delta real, or seed noise?
# Preserves the pre-experiment export and restores it at the end.
set -e
cd "$(dirname "$0")"
OUT=benchmarks/probe_seed
mkdir -p "$OUT"
rm -rf "$OUT/pre_backup"; cp -R exported_model "$OUT/pre_backup"

for SEED in 202 303; do
  echo "=== SEED $SEED ==="
  SEED=$SEED ./.venv/bin/python train.py > "$OUT/train_seed${SEED}.log" 2>&1
  ./.venv/bin/python convert_tfjs.py > /dev/null 2>&1
  ./.venv/bin/python probe_eval.py exported_model benchmarks/probe_set.clean.jsonl \
    > "$OUT/probe_seed${SEED}.txt" 2>&1
  cp benchmarks/probe_report.json "$OUT/report_seed${SEED}.json"
  grep -E "intent accuracy|intent\+taskType" "$OUT/probe_seed${SEED}.txt"
done

rm -rf exported_model; cp -R "$OUT/pre_backup" exported_model
echo "SEED REPEAT DONE (run-30 export restored)"
