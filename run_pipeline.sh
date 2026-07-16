#!/usr/bin/env bash
#
# run_pipeline.sh — full end-to-end pipeline for the WealthPilot intent model.
#
#   specs  →  generate  →  validate (HARD GATE)  →  codegen  →  train  →  tfjs export
#
# The validation gate is a hard stop: if the dataset fails any quality check,
# the pipeline aborts BEFORE training so a bad dataset can never reach the model.
#
# Usage:
#   ./run_pipeline.sh                 # full run incl. training
#   ./run_pipeline.sh --no-train      # data pipeline only (generate → codegen)
#   ./run_pipeline.sh --app /path/to/wealthpilot_native_app   # also emit app artifacts
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DO_TRAIN=1
APP_DIR="${WP_APP_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-train) DO_TRAIN=0; shift ;;
    --app) APP_DIR="$2"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

# ── pretty logging ──────────────────────────────────────────────────────────
bold=$'\033[1m'; green=$'\033[32m'; red=$'\033[31m'; yellow=$'\033[33m'; dim=$'\033[2m'; reset=$'\033[0m'
step() { echo; echo "${bold}▶ $*${reset}"; }
ok()   { echo "${green}✓ $*${reset}"; }
warn() { echo "${yellow}⚠ $*${reset}"; }
die()  { echo "${red}✗ $*${reset}" >&2; exit 1; }

# ── 0. preflight ────────────────────────────────────────────────────────────
step "Preflight — checking toolchain"
command -v node >/dev/null || die "node not found. Install Node.js and re-run."
if [[ ! -d node_modules ]]; then
  warn "node_modules missing — running npm install"
  npm install
fi
ok "Node toolchain ready ($(node --version))"

# ── 1. generate ─────────────────────────────────────────────────────────────
step "1/5 Generate dataset from knowledge specs"
npm run --silent dataset:generate
ok "Dataset generated → exported_dataset/spec_dataset.jsonl"

# ── 2. validate (HARD GATE) ─────────────────────────────────────────────────
step "2/5 Validate — quality gate"
if npm run --silent dataset:validate; then
  ok "All quality gates passed"
else
  die "Validation FAILED — aborting before training. Fix the specs and re-run.
     (No dataset that fails the gate is ever trained on.)"
fi

# ── 3. codegen (local) ──────────────────────────────────────────────────────
step "3/5 Codegen — labels + route map"
npm run --silent dataset:codegen
ok "Generated labels + route map → exported_dataset/generated/"

# ── 3b. codegen (app) — optional ────────────────────────────────────────────
if [[ -n "$APP_DIR" ]]; then
  step "3b Codegen into app repo"
  if [[ -d "$APP_DIR" ]]; then
    WP_APP_DIR="$APP_DIR" npm run --silent dataset:codegen:app
    ok "App artifacts written into $APP_DIR"
  else
    warn "App dir not found: $APP_DIR — skipping app codegen"
  fi
fi

# ── 4 + 5. train + export ───────────────────────────────────────────────────
if [[ "$DO_TRAIN" -eq 0 ]]; then
  echo; ok "Data pipeline complete (--no-train). Skipping training."
  exit 0
fi

step "4/5 Prepare Python environment for training"
PY="${PYTHON:-}"
if [[ -z "$PY" ]]; then
  # deps require Python >= 3.9; prefer 3.11 if present
  for c in python3.11 python3.10 python3.12 python3; do
    if command -v "$c" >/dev/null; then PY="$c"; break; fi
  done
fi
[[ -n "$PY" ]] || die "No Python found. Install Python >=3.9 or set PYTHON=/path/to/python."

VENV="$ROOT/training_pipeline/.venv"
if [[ ! -d "$VENV" ]]; then
  echo "${dim}Creating venv at $VENV using $PY${reset}"
  "$PY" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
echo "${dim}Installing training dependencies (first run may take a few minutes)…${reset}"
pip install --quiet --upgrade pip
pip install --quiet -r training_pipeline/requirements.txt
ok "Python env ready ($(python --version 2>&1))"

step "5/5 Train model + export TensorFlow.js"
( cd training_pipeline && python train.py )
ok "Training complete"

echo
echo "${bold}${green}Pipeline finished.${reset}"
echo "  Dataset : exported_dataset/spec_dataset.jsonl"
echo "  Model   : training_pipeline/exported_model/  (tfjs/model.json, weights, labels.json, vocabulary.json)"
[[ -n "$APP_DIR" ]] && echo "  App gen : $APP_DIR (labels.generated.json, intentRouteMap.generated.ts)"
echo
echo "${dim}Next: promote exported_model/ into the app and retrain-adopt per README §8–9.${reset}"
