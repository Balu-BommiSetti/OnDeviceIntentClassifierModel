#!/usr/bin/env python3
"""
Score the CURRENT exported model against the labelled probe set — no retraining.

WHY THIS EXISTS
The old loop discovered every gap only after a ~25-minute training run. But
every gap we actually hit (ALLOCATION verbs untrained, loan reads collapsing to
UNKNOWN, "gas stations" not reaching Fuel) was a COVERAGE problem that the
already-exported model could have revealed in two minutes. Training was needed
to FIX those, never to FIND them.

This closes that loop. bucketProbe.ts generates queries one intent+taskType at
a time, so every row is labelled by construction; this scores the shipped model
against them and prints a per-bucket heatmap. Weak buckets are then known
BEFORE any training, so a run is spent on confirmed gaps and we retrain once
instead of once per discovery.

It also supplies the ground truth the device harness has never had: the harness
records what the model said, never what it should have said, so its "accuracy"
was always a judgement call. Here it is a measurement.

Usage:
  python probe_eval.py [exported_model] [benchmarks/probe_set.jsonl]
  python probe_eval.py --failures        # dump failing rows for inspection
"""
import collections
import json
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

from run_benchmark import load_artifacts
from qa_suite import predict_full  # masked argmax + BIO span decode

PROBE_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "probe_set.jsonl")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "probe_report.json")


def run(export_dir: str, probe_path: str, show_failures: bool = False):
    if not os.path.exists(probe_path):
        raise FileNotFoundError(
            f"{probe_path} not found — generate it first:\n"
            f"  ./scripts/run-ts.sh src/knowledge/bucketProbe.ts"
        )

    labels, word2idx, model = load_artifacts(export_dir)
    cases = [json.loads(l) for l in open(probe_path) if l.strip()]

    results = []
    for c in cases:
        pred = predict_full(c["utterance"], model, word2idx, labels)
        intent_ok = pred["intent"] == c["intent"]
        task_ok = pred["task"] == c["taskType"]
        results.append({
            "utterance": c["utterance"],
            "expectedIntent": c["intent"], "predIntent": pred["intent"],
            "expectedTaskType": c["taskType"], "predTaskType": pred["task"],
            "intent_conf": pred["intent_conf"],
            "entities": pred["entities"],
            "intent_ok": intent_ok, "task_ok": task_ok,
            "passed": intent_ok and task_ok,
        })

    total = len(results)
    by_bucket = collections.defaultdict(lambda: {"n": 0, "intent_ok": 0, "both_ok": 0})
    confusion = collections.Counter()
    for r in results:
        b = f"{r['expectedIntent']}|{r['expectedTaskType']}"
        by_bucket[b]["n"] += 1
        by_bucket[b]["intent_ok"] += r["intent_ok"]
        by_bucket[b]["both_ok"] += r["passed"]
        if not r["intent_ok"]:
            confusion[f"{r['expectedIntent']} -> {r['predIntent']}"] += 1

    print(f"\nPROBE SET: {total} labelled queries across {len(by_bucket)} buckets")
    print(f"  intent accuracy      {sum(r['intent_ok'] for r in results)/total:.1%}")
    print(f"  intent+taskType      {sum(r['passed'] for r in results)/total:.1%}")

    print("\nWEAKEST BUCKETS (intent+taskType):")
    ranked = sorted(by_bucket.items(), key=lambda kv: kv[1]["both_ok"] / max(kv[1]["n"], 1))
    for b, s in ranked[:18]:
        rate = s["both_ok"] / max(s["n"], 1)
        mark = "❌" if rate < 0.34 else ("⚠ " if rate < 0.67 else "✅")
        print(f"  {mark} {b:42s} {s['both_ok']:3d}/{s['n']:<3d} {rate:6.1%}"
              f"   (intent alone {s['intent_ok']/max(s['n'],1):5.1%})")

    if confusion:
        print("\nTOP INTENT CONFUSIONS:")
        for pair, n in confusion.most_common(12):
            print(f"  {n:4d}  {pair}")

    if show_failures:
        print("\nFAILING ROWS:")
        for r in results:
            if not r["passed"]:
                print(f"  {r['utterance'][:62]!r}")
                print(f"      exp {r['expectedIntent']}|{r['expectedTaskType']}"
                      f"  got {r['predIntent']}|{r['predTaskType']} @{r['intent_conf']:.2f}")

    with open(REPORT_PATH, "w") as f:
        json.dump({
            "total": total,
            "intentAccuracy": sum(r["intent_ok"] for r in results) / total,
            "bucketAccuracy": sum(r["passed"] for r in results) / total,
            "byBucket": {k: dict(v) for k, v in by_bucket.items()},
            "confusions": dict(confusion),
            "results": results,
        }, f, indent=2)
    print(f"\n📊 {REPORT_PATH}")
    return results


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    run(args[0] if args else "exported_model",
        args[1] if len(args) > 1 else PROBE_PATH,
        show_failures="--failures" in sys.argv)
