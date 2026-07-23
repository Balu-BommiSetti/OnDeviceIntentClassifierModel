#!/usr/bin/env python3
"""
Regression suite runner. Checks the fixed, versioned set of canonical
utterances (benchmarks/regression_suite.jsonl, one deterministic case per
valid (intent, action) pair, built by src/knowledge/buildRegressionSuite.ts)
against the freshly-exported model.

Fails loudly if a case that a PRIOR run got right now fails — the training-
pipeline analogue of dispatcherIntentField.test.ts's regression-guard
pattern. Tracks pass/fail history in benchmarks/regression_baseline.json so
"regressed" means "used to pass, now doesn't," not just "currently failing"
(some cases may never have passed and that's a separate, tracked concern,
not a build-breaking regression on every run).

Usage: python regression_suite.py [exported_model_dir]
"""
import os
import sys
import json
import shutil
import datetime

sys.path.insert(0, os.path.dirname(__file__))
from run_benchmark import load_artifacts, predict  # reuse the same tokenizer/predict logic

CONFIDENCE_FLOOR = 0.5

SUITE_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "regression_suite.jsonl")
BASELINE_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "regression_baseline.json")



def assert_all_cases_are_testable(cases, labels):
    """Fail loud if any case asserts a bucket the model was never taught.

    WHY: the suite once held 22 cases (of 61) asserting intent|taskType pairs
    that no spec declared and that had ZERO training rows. The model could not
    pass them by construction, so the suite read 35/61 (57%) when its real
    score on testable cases was 35/39 (90%). A permanently-red suite gets
    ignored, and the 3 genuine regressions hiding inside it nearly were.

    Untestable cases are not noise — they are taxonomy gaps worth tracking —
    but they belong in benchmarks/taxonomy_gaps.jsonl, not in a pass/fail gate.
    This guard keeps the boundary from eroding again.
    """
    known_intents = set(labels["intents"])
    known_tasks = set(labels["tasks"])
    bad = [
        c for c in cases
        if c["intent"] not in known_intents or c["taskType"] not in known_tasks
    ]
    if bad:
        lines = "\n".join(f"    {c['intent']}|{c['taskType']}  {c['utterance']!r}" for c in bad[:10])
        raise AssertionError(
            f"{len(bad)} regression case(s) assert labels outside the trained "
            f"label space:\n{lines}\n"
            "Move them to benchmarks/taxonomy_gaps.jsonl, or add the bucket to "
            "the intent spec and regenerate the dataset."
        )


def run(export_dir):
    if not os.path.exists(SUITE_PATH):
        raise FileNotFoundError(
            f"{SUITE_PATH} not found — run `npx tsx src/knowledge/buildRegressionSuite.ts` first."
        )

    labels, word2idx, char2idx, model = load_artifacts(export_dir)

    with open(SUITE_PATH) as f:
        cases = [json.loads(l) for l in f if l.strip()]

    assert_all_cases_are_testable(cases, labels)

    baseline = {}
    if os.path.exists(BASELINE_PATH):
        with open(BASELINE_PATH) as f:
            baseline = json.load(f)

    results = []
    regressions = []
    new_baseline = {}

    for case in cases:
        pred = predict(case["utterance"], model, word2idx, labels, char2idx)
        passed = (
            pred["intent"] == case["intent"]
            and pred["task"] == case["taskType"]
            and pred["intent_conf"] >= CONFIDENCE_FLOOR
        )
        # Key on the UTTERANCE, not the bucket. The suite holds one case per
        # intent|taskType today, so a bucket key happens to be unique — but the
        # moment a second case is added to any bucket, a bucket key would make
        # the two overwrite each other in the baseline and silently disable
        # regression detection for one of them.
        key = f"{case['intent']}|{case['taskType']}|{case['utterance']}"
        was_passing = baseline.get(key, {}).get("passed", None)

        # Record expected and predicted under DISTINCT names. {**case, **pred}
        # let pred["intent"] overwrite the expected intent, so the failure
        # printout below reported the predicted label as both "got" and
        # "expected" — which makes a misclassification look like a match and
        # actively misleads whoever is diagnosing the failure.
        record = {
            "utterance": case["utterance"],
            "expectedIntent": case["intent"],
            "expectedTaskType": case["taskType"],
            "predIntent": pred["intent"],
            "predTaskType": pred["task"],
            "intent_conf": pred["intent_conf"],
            "passed": passed,
            "key": key,
        }

        if was_passing is True and not passed:
            regressions.append(record)

        new_baseline[key] = {"passed": passed, "utterance": case["utterance"]}
        results.append(record)

    pass_count = sum(r["passed"] for r in results)
    total = len(results)

    print(f"\nRegression suite: {pass_count}/{total} passing ({100*pass_count/total:.1f}%)")
    if regressions:
        print(f"\n❌ {len(regressions)} REGRESSION(S) — previously passing, now failing:")
        for r in regressions:
            print(f"  \"{r['utterance']}\" -> got {r['predIntent']}/{r['predTaskType']} ({r['intent_conf']:.2f}), expected {r['expectedIntent']}/{r['expectedTaskType']} [was passing]")
    else:
        print("✅ No regressions vs. the prior baseline.")

    failing_never_passed = [r for r in results if not r["passed"] and baseline.get(r["key"], {}).get("passed") is not False]
    if failing_never_passed:
        print(f"\n⚠ {len(failing_never_passed)} case(s) failing but not flagged as a regression (no prior passing baseline recorded):")
        for r in failing_never_passed:
            print(f"  \"{r['utterance']}\" -> got {r['predIntent']}/{r['predTaskType']} ({r['intent_conf']:.2f}), expected {r['expectedIntent']}/{r['expectedTaskType']}")

    # Snapshot the OUTGOING baseline before overwriting it.
    #
    # WHY: the baseline is a single generation. Running the suite twice makes a
    # newly-broken case look "always broken" — it was recorded as failing by
    # the first run, so the second sees no regression. That already bit us on
    # 2026-07-19: the 3 genuine regressions had to be reconstructed from a
    # backup because train.py's own suite run had consumed the signal before
    # anyone looked. Dated snapshots make the history reconstructable and cost
    # a few KB per run.
    if os.path.exists(BASELINE_PATH):
        hist_dir = os.path.join(os.path.dirname(BASELINE_PATH), "baseline_history")
        os.makedirs(hist_dir, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy(BASELINE_PATH, os.path.join(hist_dir, f"regression_baseline-{stamp}.json"))
        # Keep the newest 20; older history has never been useful in practice.
        snaps = sorted(os.listdir(hist_dir))
        for old_snap in snaps[:-20]:
            os.remove(os.path.join(hist_dir, old_snap))

    with open(BASELINE_PATH, "w") as f:
        json.dump(new_baseline, f, indent=2)

    summary = {
        "totalCases": total,
        "passCount": pass_count,
        "passRate": pass_count / total,
        "regressionCount": len(regressions),
        "regressions": regressions,
        # Persist EVERY case, not just regressions: diagnosing a pass-rate drop
        # otherwise means re-running inference just to see which cases failed,
        # and re-running rewrites the baseline as a side effect.
        "failures": [r for r in results if not r["passed"]],
    }
    ok = len(regressions) == 0
    return ok, summary


if __name__ == "__main__":
    export_dir = sys.argv[1] if len(sys.argv) > 1 else "exported_model"
    ok, summary = run(export_dir)
    out_path = os.path.join(os.path.dirname(__file__), "benchmarks", "regression_report.json")
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"\n📊 Regression report written to {out_path}")
    sys.exit(0 if ok else 1)
