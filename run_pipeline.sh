#!/usr/bin/env bash
#
# run_pipeline.sh — full end-to-end pipeline for the WealthPilot intent model.
#
#   specs  →  generate  →  validate (HARD GATE)  →  manifest  →  regression suite  →  codegen  →  train  →  tfjs export
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
step "1/7 Generate dataset from knowledge specs"
npm run --silent dataset:generate
ok "Dataset generated → exported_dataset/spec_dataset.jsonl"

# ── 2. validate (HARD GATE) ─────────────────────────────────────────────────
step "2/7 Validate — quality gate"
if npm run --silent dataset:validate; then
  ok "All quality gates passed"
else
  die "Validation FAILED — aborting before training. Fix the specs and re-run.
     (No dataset that fails the gate is ever trained on.)"
fi

# ── 3. manifest — version + hash the dataset that just passed the gate ─────
step "3/7 Manifest — version this dataset build"
npm run --silent dataset:manifest
ok "Manifest written → exported_dataset/manifests/"

# ── 4. regression suite — rebuild the fixed canonical-utterance set ────────
step "4/7 Regression suite — rebuild canonical utterance set"
npm run --silent dataset:regression-suite
ok "Regression suite written → v6/training_pipeline/benchmarks/regression_suite.jsonl"

# ── 5. codegen (local) ──────────────────────────────────────────────────────
step "5/7 Codegen — labels + route map"
npm run --silent dataset:codegen
ok "Generated labels + route map → exported_dataset/generated/"

# ── 5b. codegen (app) — optional ────────────────────────────────────────────
if [[ -n "$APP_DIR" ]]; then
  step "5b Codegen into app repo"
  if [[ -d "$APP_DIR" ]]; then
    WP_APP_DIR="$APP_DIR" npm run --silent dataset:codegen:app
    ok "App artifacts written into $APP_DIR"
  else
    warn "App dir not found: $APP_DIR — skipping app codegen"
  fi
fi

# ── 6 + 7. train + export ───────────────────────────────────────────────────
if [[ "$DO_TRAIN" -eq 0 ]]; then
  echo; ok "Data pipeline complete (--no-train). Skipping training."
  exit 0
fi

step "6/7 Prepare Python environment for training"
PY="${PYTHON:-}"
if [[ -z "$PY" ]]; then
  # deps require Python >= 3.9; prefer 3.11 if present
  for c in python3.11 python3.10 python3.12 python3; do
    if command -v "$c" >/dev/null; then PY="$c"; break; fi
  done
fi
[[ -n "$PY" ]] || die "No Python found. Install Python >=3.9 or set PYTHON=/path/to/python."

VENV="$ROOT/v6/training_pipeline/.venv"
if [[ ! -d "$VENV" ]]; then
  echo "${dim}Creating venv at $VENV using $PY${reset}"
  "$PY" -m venv "$VENV"
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate"
echo "${dim}Installing training dependencies (first run may take a few minutes)…${reset}"
pip install --quiet --upgrade pip
pip install --quiet -r v6/training_pipeline/requirements.txt
ok "Python env ready ($(python --version 2>&1))"

step "7/7 Train model + export TensorFlow.js"
( cd v6/training_pipeline && python train.py )
ok "Training complete"

# ── 7b. sync binary model artifacts into the app repo — optional ───────────
# Runs the export integrity check first (train.py already ran it once during
# export, but this re-checks the specific files about to be copied) and
# refuses to sync a broken pairing. Paired with step 5b's codegenApp.ts run —
# together these are the ONLY writers of app model assets (Phase 4 item 3).
if [[ -n "$APP_DIR" && -d "$APP_DIR" ]]; then
  step "7b Sync model binaries into app repo"
  if ( cd v6/training_pipeline && python app_sync.py "$APP_DIR" ); then
    ok "Model binaries synced into $APP_DIR/assets/nlp/"
  else
    die "App asset sync FAILED — export integrity check rejected this build. Not promoted to $APP_DIR."
  fi
fi

echo
echo "${bold}${green}Pipeline finished.${reset}"
echo "  Dataset : exported_dataset/spec_dataset.jsonl"
echo "  Model   : v6/training_pipeline/exported_model/  (tfjs/model.json, weights, labels.json, vocabulary.json)"
if [[ -n "$APP_DIR" ]]; then
  echo "  App gen : $APP_DIR/assets/nlp/ (tfjs/*, vocabulary.json, category_mapping.json)"
  echo "            $APP_DIR (labels.generated.json, intentRouteMap.generated.ts — review + promote by hand)"
fi
