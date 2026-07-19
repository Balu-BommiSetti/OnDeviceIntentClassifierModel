#!/usr/bin/env python3
"""
Deployment checklist (Phase 4 item 4). Runs every gate a model build must
clear before being considered safe to promote into the app repo, and prints
a pass/fail summary. Everything here is re-checking artifacts that should
already exist from a `run_pipeline.sh` run — this script doesn't run the
pipeline itself, it audits the result.

Usage: python deployment_checklist.py [exported_model_dir]

Checks:
  1. Dataset manifest exists and is the latest version
  2. Dataset validation gate passed (dataset_quality_report.json present,
     implies validate.ts exited 0 — see manifest's provenance)
  3. eval_report.json exists and meets the configured accuracy floors
  4. Hard-example benchmark results present in eval_report.json
  5. Regression suite: zero regressions in the last run
  6. Export integrity check passes (vocab/model/labels consistency)
  7. App-side artifacts exist and are internally consistent (if app dir given)
"""
import os
import sys
import json
import glob

sys.path.insert(0, os.path.dirname(__file__))
from convert import check_export_integrity, IntegrityError

# Accuracy floors — REAL GATES as of Phase 0 (2026-07-18 production plan).
# These were 0.0 ("TODO: raise"), which let the 2026-07-17 model (21.5%
# intent accuracy, 0/61 regression passes) deploy cleanly. A build that
# cannot clear these numbers is not deployable, full stop; the floors are
# the plan's Phase-3 targets and rise (never fall) release over release.
MIN_INTENT_ACCURACY = 0.85              # Tier-1: held-out skeletons
MIN_HARD_EXAMPLE_INTENT_ACCURACY = 0.60  # Tier-2: real-world phrasings, rises per release
MIN_ENTITY_TOKEN_F1 = 0.85              # NER head, token-level F1
MIN_REGRESSION_PASS_RATE = 0.90         # absolute floor; regressionCount>0 still fails independently


class CheckResult:
    def __init__(self, name, ok, detail=""):
        self.name = name
        self.ok = ok
        self.detail = detail


def check_manifest(dataset_dir):
    manifests_dir = os.path.join(dataset_dir, "manifests")
    version_file = os.path.join(manifests_dir, "current_version.json")
    if not os.path.exists(version_file):
        return CheckResult("Dataset manifest", False, "no current_version.json — run `npm run dataset:manifest`")
    with open(version_file) as f:
        version = json.load(f)["version"]
    manifest_path = os.path.join(manifests_dir, f"v{version}.json")
    if not os.path.exists(manifest_path):
        return CheckResult("Dataset manifest", False, f"current_version.json points at v{version} but {manifest_path} is missing")
    return CheckResult("Dataset manifest", True, f"v{version}")


def check_quality_report(dataset_dir):
    path = os.path.join(dataset_dir, "dataset_quality_report.json")
    if not os.path.exists(path):
        return CheckResult("Dataset validation gate", False, "dataset_quality_report.json missing — run `npm run dataset:validate`")
    with open(path) as f:
        report = json.load(f)
    # Phase 0: gate on the validation OUTCOME, not file existence. Reports
    # written before validationPassed existed are treated as failing —
    # re-running `npm run dataset:validate` is cheap and removes ambiguity.
    if not report.get("validationPassed", False):
        detail = f"validation FAILED ({report.get('errorCount', '?')} issue(s)) — run `npm run dataset:validate` for the list"
        return CheckResult("Dataset validation gate", False, detail)
    return CheckResult("Dataset validation gate", True, f"{report['totalRows']} rows, {report['intentCount']} intents")


def check_eval_report(export_dir):
    path = os.path.join(export_dir, "eval_report.json")
    if not os.path.exists(path):
        return CheckResult("Evaluation report", False, "eval_report.json missing — run train.py")
    with open(path) as f:
        report = json.load(f)
    acc = report["intent"]["accuracy"]
    if acc < MIN_INTENT_ACCURACY:
        return CheckResult("Evaluation report", False, f"intent accuracy {acc:.2%} below floor {MIN_INTENT_ACCURACY:.2%}")
    return CheckResult("Evaluation report", True, f"intent accuracy {acc:.2%}, taskType accuracy {report['taskType']['accuracy']:.2%}")


def check_hard_example_benchmark(export_dir):
    path = os.path.join(export_dir, "eval_report.json")
    if not os.path.exists(path):
        return CheckResult("Hard-example benchmark", False, "eval_report.json missing")
    with open(path) as f:
        report = json.load(f)
    bench = report.get("hardExampleBenchmark")
    if not bench:
        return CheckResult("Hard-example benchmark", False, "not present in eval_report.json — did train.py's benchmark step run?")
    acc = bench["intentAccuracy"]
    if acc < MIN_HARD_EXAMPLE_INTENT_ACCURACY:
        return CheckResult("Hard-example benchmark", False, f"intent accuracy {acc:.2%} below floor {MIN_HARD_EXAMPLE_INTENT_ACCURACY:.2%}")
    return CheckResult("Hard-example benchmark", True, f"intent accuracy {acc:.2%}")


def check_regression_suite(export_dir):
    """Read the FRESHEST regression result, and refuse a result older than the model.

    WHY: this check used to read only the copy embedded in eval_report.json,
    which train.py writes once at the end of training. Re-running
    regression_suite.py afterwards writes benchmarks/regression_report.json and
    leaves the embedded copy untouched — so the gate kept reporting failures
    that had already been resolved, and would equally have kept reporting a
    PASS after a change introduced new failures. A gate that describes a state
    which no longer exists is worse than no gate.
    """
    model_path = os.path.join(export_dir, "nlp_multitask_model.h5")
    standalone = os.path.join(os.path.dirname(__file__), "benchmarks", "regression_report.json")
    embedded = os.path.join(export_dir, "eval_report.json")

    suite, src = None, None
    cands = []
    if os.path.exists(standalone):
        cands.append((os.path.getmtime(standalone), standalone, "regression_report.json"))
    if os.path.exists(embedded):
        cands.append((os.path.getmtime(embedded), embedded, "eval_report.json"))
    if not cands:
        return CheckResult("Regression suite", False, "no regression result found — run regression_suite.py")

    mtime, path, src = max(cands)
    with open(path) as f:
        data = json.load(f)
    suite = data.get("regressionSuite", data) if src == "eval_report.json" else data
    if not suite or "regressionCount" not in suite:
        return CheckResult("Regression suite", False, f"{src} has no regression results — did the suite run?")

    # A result that predates the model describes a DIFFERENT model.
    if os.path.exists(model_path) and mtime < os.path.getmtime(model_path):
        return CheckResult("Regression suite", False,
                           f"{src} is older than the model — re-run regression_suite.py")
    if suite["regressionCount"] > 0:
        return CheckResult("Regression suite", False, f"{suite['regressionCount']} regression(s) vs. prior baseline")
    # Absolute pass-rate floor (Phase 0): "no regressions" alone passed a
    # 0/61 suite — nothing can regress from zero.
    pass_rate = suite["passCount"] / suite["totalCases"] if suite.get("totalCases") else 0.0
    if pass_rate < MIN_REGRESSION_PASS_RATE:
        return CheckResult("Regression suite", False, f"pass rate {pass_rate:.2%} below floor {MIN_REGRESSION_PASS_RATE:.2%} ({suite['passCount']}/{suite['totalCases']})")
    return CheckResult("Regression suite", True, f"{suite['passCount']}/{suite['totalCases']} passing, 0 regressions ({src})")


def check_entity_f1(export_dir):
    path = os.path.join(export_dir, "eval_report.json")
    if not os.path.exists(path):
        return CheckResult("Entity extraction (NER F1)", False, "eval_report.json missing")
    with open(path) as f:
        report = json.load(f)
    entities = report.get("entities")
    if not entities or "tokenLevelF1" not in entities:
        return CheckResult("Entity extraction (NER F1)", False, "entities.tokenLevelF1 not present in eval_report.json")
    f1 = entities["tokenLevelF1"]
    if f1 < MIN_ENTITY_TOKEN_F1:
        return CheckResult("Entity extraction (NER F1)", False, f"token-level F1 {f1:.3f} below floor {MIN_ENTITY_TOKEN_F1:.2f}")
    return CheckResult("Entity extraction (NER F1)", True, f"token-level F1 {f1:.3f}")


def check_export_integrity_gate(export_dir):
    try:
        check_export_integrity(export_dir)
        return CheckResult("Export integrity", True, "vocab/model/labels mutually consistent")
    except IntegrityError as e:
        return CheckResult("Export integrity", False, str(e))
    except FileNotFoundError as e:
        return CheckResult("Export integrity", False, str(e))


def check_app_artifacts(app_dir):
    if not app_dir:
        return CheckResult("App-side artifacts", True, "skipped — no --app dir given")
    app_nlp_dir = os.path.join(app_dir, "assets", "nlp")
    try:
        check_export_integrity(app_nlp_dir)
        return CheckResult("App-side artifacts", True, f"{app_nlp_dir} internally consistent")
    except (IntegrityError, FileNotFoundError) as e:
        return CheckResult("App-side artifacts", False, str(e))


def run(export_dir="exported_model", dataset_dir="../../exported_dataset", app_dir=None):
    checks = [
        check_manifest(dataset_dir),
        check_quality_report(dataset_dir),
        check_eval_report(export_dir),
        check_hard_example_benchmark(export_dir),
        check_entity_f1(export_dir),
        check_regression_suite(export_dir),
        check_export_integrity_gate(export_dir),
        check_app_artifacts(app_dir),
    ]

    print("\n" + "=" * 60)
    print("  DEPLOYMENT CHECKLIST")
    print("=" * 60)
    for c in checks:
        status = "✅" if c.ok else "❌"
        print(f"{status} {c.name:28s} {c.detail}")
    print("=" * 60)

    ok = all(c.ok for c in checks)
    print("READY TO DEPLOY" if ok else "NOT READY — fix the ❌ items above")
    return ok, checks


if __name__ == "__main__":
    export_dir = sys.argv[1] if len(sys.argv) > 1 else "exported_model"
    app_dir = sys.argv[2] if len(sys.argv) > 2 else None
    ok, _ = run(export_dir=export_dir, app_dir=app_dir)
    sys.exit(0 if ok else 1)
