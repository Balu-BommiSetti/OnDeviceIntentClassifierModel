#!/usr/bin/env python3
"""
Hard-example benchmark runner. Loads the exported model and runs
benchmarks/hard_cases.jsonl against it, reporting per-category pass rates.

This measures real-world performance on the specific failure classes already
observed in production (bare replies, ambiguous intent boundaries, live-log
bugs, correction utterances, out-of-domain rejection, amount-format
diversity, code-switch) rather than only in-distribution validation accuracy
— see on_device_nlp_implementation_roadmap.md Phase 3, item 2.

Usage: python run_benchmark.py [exported_model_dir]
"""
import os
import sys
import json
import re

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
import numpy as np
import tensorflow as tf

MAX_SEQ_LENGTH = 64
_CURRENCY_SYMBOLS = re.compile(r"[$₹£€₨]")
_SENTENCE_PUNCT = re.compile(r"(?<!\d)[.,](?!\d)|[?!]")


def clean_tokenize(text):
    text_clean = _CURRENCY_SYMBOLS.sub("", text.lower())
    text_clean = _SENTENCE_PUNCT.sub(" ", text_clean)
    return [t.strip() for t in text_clean.split() if t.strip()]


def numeric_vocab_key(token):
    if not any(c.isdigit() for c in token):
        return token
    digits = re.sub(r"[^0-9]", "", token)
    suffix = re.sub(r"[0-9.,]", "", token)
    has_decimal = "." in token
    return f"<NUM{len(digits)}{'D' if has_decimal else ''}{suffix}>"


def load_artifacts(export_dir):
    with open(os.path.join(export_dir, "labels.json")) as f:
        labels = json.load(f)
    with open(os.path.join(export_dir, "vocabulary.json")) as f:
        vocab_raw = json.load(f)
    word2idx = vocab_raw.get("word2idx", vocab_raw)
    # Intent-conditioned taskType mask (action_mask.json, built from the
    # specs' supported_actions). The task head is a GLOBAL softmax that knows
    # nothing about the predicted intent, so unmasked it can emit combinations
    # no engine serves — observed: ADD_LIABILITY|SCHEDULE at 0.72 confidence
    # for "remove my home loan", a dead route in FinanceDispatcher. Restricting
    # the argmax to the intent's allowed set is part of the PRODUCT inference
    # path (the app must apply the same mask), so the harness measures the
    # shipped behaviour, not the raw head.
    mask_path = os.path.join(export_dir, "action_mask.json")
    labels["_allowed_tasks"] = None
    if os.path.exists(mask_path):
        with open(mask_path) as f:
            labels["_allowed_tasks"] = json.load(f)["allowed"]
    model = tf.keras.models.load_model(os.path.join(export_dir, "nlp_multitask_model.h5"))
    return labels, word2idx, model


def predict(text, model, word2idx, labels):
    tokens = clean_tokenize(text)
    X = np.zeros((1, MAX_SEQ_LENGTH), dtype=np.int32)
    for j, token in enumerate(tokens[:MAX_SEQ_LENGTH]):
        key = numeric_vocab_key(token)
        X[0, j] = word2idx.get(key, word2idx.get("<UNK>", 1))

    intent_out, task_out, _slots_out = model.predict(X, verbose=0)
    intent_idx = int(np.argmax(intent_out[0]))
    intent_name = labels["intents"][intent_idx]

    allowed = (labels.get("_allowed_tasks") or {}).get(intent_name)
    task_probs = task_out[0]
    if allowed:
        allowed_idx = [i for i, t in enumerate(labels["tasks"]) if t in allowed]
        if allowed_idx:  # never mask down to nothing
            task_idx = max(allowed_idx, key=lambda i: task_probs[i])
        else:
            task_idx = int(np.argmax(task_probs))
    else:
        task_idx = int(np.argmax(task_probs))

    return {
        "intent": intent_name,
        "intent_conf": float(intent_out[0][intent_idx]),
        "task": labels["tasks"][task_idx],
        "task_conf": float(task_probs[task_idx]),
    }


def run(export_dir, cases_path):
    labels, word2idx, model = load_artifacts(export_dir)

    with open(cases_path) as f:
        cases = [json.loads(l) for l in f if l.strip()]

    results = []
    for case in cases:
        pred = predict(case["text"], model, word2idx, labels)
        intent_ok = pred["intent"] == case["expected_intent"]
        task_ok = pred["task"] == case["expected_task"]
        results.append({**case, **pred, "intent_ok": intent_ok, "task_ok": task_ok, "both_ok": intent_ok and task_ok})

    total = len(results)
    intent_pass = sum(r["intent_ok"] for r in results)
    both_pass = sum(r["both_ok"] for r in results)

    by_category = {}
    for r in results:
        cat = r["category"]
        by_category.setdefault(cat, {"total": 0, "intent_pass": 0, "both_pass": 0})
        by_category[cat]["total"] += 1
        by_category[cat]["intent_pass"] += r["intent_ok"]
        by_category[cat]["both_pass"] += r["both_ok"]

    print(f"\nHard-example benchmark: {total} cases")
    print(f"  Intent accuracy:        {intent_pass}/{total} ({100*intent_pass/total:.1f}%)")
    print(f"  Intent+Task accuracy:   {both_pass}/{total} ({100*both_pass/total:.1f}%)")
    print("\nBy category:")
    for cat, stats in sorted(by_category.items()):
        pct = 100 * stats["intent_pass"] / stats["total"]
        print(f"  {cat:22s} {stats['intent_pass']}/{stats['total']} intent ({pct:.0f}%), {stats['both_pass']}/{stats['total']} intent+task")

    print("\nFailures:")
    for r in results:
        if not r["intent_ok"]:
            print(f"  ✗ \"{r['text']}\" -> got {r['intent']} ({r['intent_conf']:.2f}), expected {r['expected_intent']} [{r['category']}]")

    return {
        "totalCases": total,
        "intentAccuracy": intent_pass / total,
        "intentTaskAccuracy": both_pass / total,
        "byCategory": {
            cat: {"total": s["total"], "intentPass": s["intent_pass"], "bothPass": s["both_pass"]}
            for cat, s in by_category.items()
        },
        "results": results,
    }


if __name__ == "__main__":
    export_dir = sys.argv[1] if len(sys.argv) > 1 else "exported_model"
    cases_path = os.path.join(os.path.dirname(__file__), "benchmarks", "hard_cases.jsonl")
    summary = run(export_dir, cases_path)
    out_path = os.path.join(os.path.dirname(__file__), "benchmarks", "benchmark_report.json")
    with open(out_path, "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"\n📊 Benchmark report written to {out_path}")
