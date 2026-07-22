#!/usr/bin/env python3
"""
QA scenario runner — the end-to-end check the pipeline never had.

WHY THIS EXISTS
regression_suite.py and run_benchmark.py both call a `predict()` that
DISCARDS the slots head (`_slots_out`). Every quality number the pipeline has
produced so far therefore measures intent and taskType only. But 175 of the
247 QA scenarios assert extracted ENTITIES, and entity extraction is the part
the product actually depends on: a correct intent with a wrong PERIOD answers
a question the user did not ask, confidently.

This runner decodes the BIO span head and grades entities, so the boundary
pairs (T2 range periods, T3 two-role comparisons, D2 prepay what-ifs) are
tested end-to-end rather than assumed.

It mirrors src/ai/model/bioSpanDecoder.ts on the app side. Both must agree:
if this grades a span as correct and the app decodes it differently, the
number here is meaningless. The shared rule is that a B- tag ALWAYS opens a
new span, so two adjacent same-type entities ("compare June vs May") stay
separate instead of collapsing into one "june may".

Usage: python qa_suite.py [exported_model] [benchmarks/qa_scenarios.jsonl]
"""
import json
import os
import sys
import collections

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np

from run_benchmark import load_artifacts, MAX_SEQ_LENGTH
from train import clean_tokenize, numeric_vocab_key

QA_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "qa_scenarios.jsonl")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "benchmarks", "qa_report.json")


def decode_bio_spans(tokens, tags):
    """BIO -> spans. A B- tag always opens a new span (see module docstring)."""
    spans, cur = [], None
    for tok, tag in zip(tokens, tags):
        if tag == "O" or tag is None:
            if cur:
                spans.append(cur)
                cur = None
            continue
        prefix, _, etype = tag.partition("-")
        if not etype:
            etype, prefix = tag, "B"
        if prefix == "B" or cur is None or cur["type"] != etype:
            if cur:
                spans.append(cur)
            cur = {"type": etype, "tokens": [tok]}
        else:
            cur["tokens"].append(tok)
    if cur:
        spans.append(cur)
    return [{"type": s["type"], "value": " ".join(s["tokens"])} for s in spans]


def predict_full(text, model, word2idx, labels):
    """
    WHY THE TASK ARGMAX IS MASKED
    load_artifacts (run_benchmark.py) already populates labels["_allowed_tasks"]
    from action_mask.json. Until 2026-07-19 this function ignored it and took
    a raw argmax over the task head — inconsistent with regression_suite.py
    (which reuses run_benchmark.predict(), masked) and with the app
    (IntentClassifier.ts applies the same mask). Every QA number reported
    before this fix — the whole 29.1% -> 46.2% arc — was measured against
    behaviour the deployed model does not exhibit: unmasked task predictions
    the mask would have corrected are silently graded as failures (or, worse,
    an unmasked lucky guess could pass where the real masked model would not).
    """
    tokens = clean_tokenize(text)
    X = np.zeros((1, MAX_SEQ_LENGTH), dtype=np.int32)
    for j, tok in enumerate(tokens[:MAX_SEQ_LENGTH]):
        X[0, j] = word2idx.get(numeric_vocab_key(tok), word2idx.get("<UNK>", 1))

    intent_out, task_out, slots_out = model.predict(X, verbose=0)
    i_idx = int(np.argmax(intent_out[0]))
    intent_name = labels["intents"][i_idx]

    task_probs = task_out[0]
    allowed = (labels.get("_allowed_tasks") or {}).get(intent_name)
    allowed_idx = [i for i, t in enumerate(labels["tasks"]) if t in allowed] if allowed else None
    t_idx = max(allowed_idx, key=lambda i: task_probs[i]) if allowed_idx else int(np.argmax(task_probs))

    slot_ids = np.argmax(slots_out[0], axis=-1)
    tags = [labels["slots"][int(s)] for s in slot_ids[: len(tokens)]]

    return {
        "intent": labels["intents"][i_idx],
        "intent_conf": float(intent_out[0][i_idx]),
        "task": labels["tasks"][t_idx],
        "task_conf": float(task_out[0][t_idx]),
        "entities": decode_bio_spans(tokens[:MAX_SEQ_LENGTH], tags),
    }


import re as _re

_AMOUNT_UNITS = {
    "k": 1_000, "l": 100_000, "lakh": 100_000, "lakhs": 100_000,
    "cr": 10_000_000, "crore": 10_000_000, "crores": 10_000_000,
    "m": 1_000_000, "grand": 1_000,
}


def _canon_amount(s):
    """Vernacular amount -> canonical integer string, else None.

    WHY: QA expectations for market_speech assert NORMALIZED amounts
    ("150000") because in the APP, marketNormalize() runs BEFORE the
    classifier — the model never sees "₹1.5L", it sees "150000". The harness
    feeds raw text, so the model correctly extracts the SURFACE span
    ("1.5l", "50k", "12 cr") and was being graded wrong for not performing a
    normalization step that lives in a different component. Canonicalising
    BOTH sides grades the model on its actual job: finding the span.
    Handles: 50k / 1.5l / 2 lakh / 12 cr / ₹1.5L / two-token "2 lakh".
    """
    t = s.lower().replace("₹", "").replace(",", "").strip()
    m = _re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)\s*(k|l|lakhs?|crores?|cr|m|grand)?", t)
    if not m:
        return None
    value = float(m.group(1)) * _AMOUNT_UNITS.get(m.group(2) or "", 1)
    if value != int(value):
        return None  # sub-unit precision ("45.50") — compare as text
    return str(int(value))


def norm(s):
    """Compare on content words only.

    Expected values are written the way a human reads them ("in May"), while
    the decoder emits what it tagged ("may"). Grading those as unequal would
    report entity failures that are purely notational, hiding the real ones.
    Leading prepositions and case are stripped from both sides, and
    vernacular amounts are canonicalised (see _canon_amount).
    """
    amt = _canon_amount(s)
    if amt is not None:
        return amt
    s = "".join(ch for ch in s.lower() if ch.isalnum() or ch.isspace()).strip()
    words = [w for w in s.split() if w not in {"in", "on", "for", "of", "the", "a", "my", "at"}]
    return " ".join(words)


def grade_entities(expected, predicted):
    """Multiset match per type — ORDER MATTERS for same-type spans.

    "compare June vs May" and "compare May vs June" produce identical
    entity SETS but mean opposite things, so same-type spans are compared
    positionally rather than as a set.
    """
    exp_by_type = collections.defaultdict(list)
    got_by_type = collections.defaultdict(list)
    for e in expected:
        exp_by_type[e["type"]].append(norm(e["value"]))
    for p in predicted:
        got_by_type[p["type"]].append(norm(p["value"]))

    # Fuzzy PERIOD sentinels the scenarios encode deliberately (see the
    # __CONTAINS_TO_DATE__ / __IMPLICIT_SECOND__ notes in qa_scenarios.jsonl:
    # "Entity span assertion is fuzzy … because the span boundary is part of
    # the design decision"). The grader never implemented that fuzziness, so it
    # compared the literal sentinel string against the model's real span and
    # always failed. Implement the AUTHOR'S intent, and no more:
    #   __CONTAINS_TO_DATE__ — satisfied if a PERIOD span carries a to-date
    #                          marker (so far / to date / mtd / ytd). If the
    #                          model extracted NO such span it still fails.
    #   __IMPLICIT_SECOND__/__FIRST__ — the comparison's other period is NOT in
    #                          the utterance (it's derived downstream by
    #                          assignPeriodRoles), so it is not an extractable
    #                          span; satisfied iff the model extracted the ONE
    #                          explicit PERIOD. A missing period still fails.
    TODATE_MARKERS = ("so far", "to date", "todate", "mtd", "ytd")
    missing, wrong, spurious = [], [], []
    for etype, exp_vals in exp_by_type.items():
        got_vals = list(got_by_type.get(etype, []))
        remaining_exp = []
        for ev in exp_vals:
            if ev == "containstodate":
                hit = next((g for g in got_vals if any(m.replace(" ", "") in g.replace(" ", "") for m in TODATE_MARKERS)), None)
                if hit is not None:
                    got_vals.remove(hit)  # consume so it's not flagged spurious
                else:
                    missing.append(f"{etype}={ev}")
            elif ev in ("implicitsecond", "implicitfirst"):
                if got_vals:
                    got_vals.pop(0)  # the explicit period satisfies it
                else:
                    missing.append(f"{etype}={ev}")
            else:
                remaining_exp.append(ev)
        # Positional compare for the non-sentinel expected values.
        for i, ev in enumerate(remaining_exp):
            if i >= len(got_vals):
                missing.append(f"{etype}={ev}")
            elif got_vals[i] != ev:
                wrong.append(f"{etype}: expected {ev!r} got {got_vals[i]!r}")
        got_by_type[etype] = got_vals  # reflect consumed spans for the spurious pass
        exp_by_type[etype] = remaining_exp
    for etype, got_vals in got_by_type.items():
        extra = len(got_vals) - len(exp_by_type.get(etype, []))
        if extra > 0:
            spurious.extend(f"{etype}={v}" for v in got_vals[-extra:])
    return missing, wrong, spurious


def run(export_dir, qa_path):
    labels, word2idx, model = load_artifacts(export_dir)
    cases = [json.loads(l) for l in open(qa_path) if l.strip()]

    results = []
    for c in cases:
        exp = c["expected"]
        pred = predict_full(c["utterance"], model, word2idx, labels)

        intent_ok = pred["intent"] == exp.get("intent")
        task_ok = pred["task"] == exp.get("taskType")
        exp_ents = exp.get("entities", [])
        missing, wrong, spurious = grade_entities(exp_ents, pred["entities"])
        ent_ok = not (missing or wrong or spurious)

        results.append({
            "id": c["id"], "class": c["class"], "utterance": c["utterance"],
            "expectedIntent": exp.get("intent"), "predIntent": pred["intent"],
            "expectedTaskType": exp.get("taskType"), "predTaskType": pred["task"],
            "intent_conf": pred["intent_conf"],
            "hasEntityAssertion": bool(exp_ents),
            "entityIssues": {"missing": missing, "wrong": wrong, "spurious": spurious},
            "intent_ok": intent_ok, "task_ok": task_ok, "entities_ok": ent_ok,
            "passed": intent_ok and task_ok and ent_ok,
        })

    total = len(results)
    ent_cases = [r for r in results if r["hasEntityAssertion"]]
    summary = {
        "totalCases": total,
        "passCount": sum(r["passed"] for r in results),
        "intentAccuracy": sum(r["intent_ok"] for r in results) / total,
        "taskTypeAccuracy": sum(r["task_ok"] for r in results) / total,
        "entityExactMatch": (sum(r["entities_ok"] for r in ent_cases) / len(ent_cases)) if ent_cases else None,
        "entityCaseCount": len(ent_cases),
    }

    by_class = {}
    for r in results:
        b = by_class.setdefault(r["class"], {"total": 0, "passed": 0})
        b["total"] += 1
        b["passed"] += r["passed"]

    print(f"\nQA scenarios: {summary['passCount']}/{total} fully passing "
          f"({100*summary['passCount']/total:.1f}%)")
    print(f"  intent   {summary['intentAccuracy']:.1%}")
    print(f"  taskType {summary['taskTypeAccuracy']:.1%}")
    if summary["entityExactMatch"] is not None:
        print(f"  entities {summary['entityExactMatch']:.1%} exact "
              f"({len(ent_cases)} cases assert entities)")

    print("\nBy scenario class (weakest first):")
    for cls, b in sorted(by_class.items(), key=lambda kv: kv[1]["passed"] / kv[1]["total"]):
        rate = b["passed"] / b["total"]
        print(f"  {'✅' if rate == 1 else '⚠ ' if rate >= 0.5 else '❌'} "
              f"{cls:32s} {b['passed']:3d}/{b['total']:<3d} {rate:6.1%}")

    with open(REPORT_PATH, "w") as f:
        json.dump({**summary, "byClass": by_class, "results": results}, f, indent=2)
    print(f"\n📊 Report written to {REPORT_PATH}")
    return summary


if __name__ == "__main__":
    export_dir = sys.argv[1] if len(sys.argv) > 1 else "exported_model"
    qa_path = sys.argv[2] if len(sys.argv) > 2 else QA_PATH
    run(export_dir, qa_path)
