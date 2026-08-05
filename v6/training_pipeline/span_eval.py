"""
Span-level entity F1 — P1-1.

The existing eval_report.json entity metrics are TOKEN-level (sklearn
classification_report over flattened B-/I-/O tags), which the report itself
flags as not span-level: "a partially-tagged multi-token entity ... counts
as a partial success here, not a full span failure." This module scores the
metric that actually reflects product behaviour — exact (type, start, end)
span matches — using the SAME BIO decode semantics as the shipped app's
decoder, ported deliberately rather than reimplemented from scratch:

  wealthpilot_native_app/src/ai/model/bioSpanDecoder.ts

  - "B-X" always OPENS a new span of type X.
  - "I-X" CONTINUES the open span when its type is also X.
  - "I-X" with no open span, or a mismatched type, is treated as an
    implicit "B-X" (orphan-I promotion).
  - "O" (or any tag with no recognized B-/I- prefix) closes the open span.

A span match requires identical (type, start_index, end_index) between gold
and predicted decodes — partial overlap does not count, unlike the
token-level metric.
"""
import re
from collections import defaultdict

_TAG_RE = re.compile(r"^([BI])-(.+)$")


def decode_bio_spans(tags):
    """Port of bioSpanDecoder.ts's decodeBioSpans. Returns a list of
    (type, start_index, end_index) tuples, inclusive indices."""
    spans = []
    open_span = None  # [type, start, end]

    def close():
        nonlocal open_span
        if open_span is not None:
            spans.append(tuple(open_span))
        open_span = None

    for i, tag in enumerate(tags):
        m = _TAG_RE.match(tag) if tag else None
        if not m:
            close()
            continue
        prefix, etype = m.group(1), m.group(2).upper()
        if prefix == "I" and open_span is not None and open_span[0] == etype:
            open_span[2] = i
        else:
            close()
            open_span = [etype, i, i]
    close()
    return spans


def span_level_report(gold_tag_seqs, pred_tag_seqs, entity_types):
    """
    gold_tag_seqs / pred_tag_seqs: list of tag-string sequences (one per
    test example, already trimmed to the real, non-padded length).
    entity_types: the full list of entity type names (without B-/I- prefix).

    Returns { perType: { TYPE: {precision, recall, f1, support} }, micro: {...} }
    matching the shape of the existing token-level entity_report_dict, so
    both can sit side by side in eval_report.json without a schema change
    elsewhere.
    """
    assert len(gold_tag_seqs) == len(pred_tag_seqs), \
        "gold/pred sequence count mismatch — cannot pair spans by example"

    tp = defaultdict(int)
    fp = defaultdict(int)
    fn = defaultdict(int)

    for gold_tags, pred_tags in zip(gold_tag_seqs, pred_tag_seqs):
        gold_spans = set(decode_bio_spans(gold_tags))
        pred_spans = set(decode_bio_spans(pred_tags))

        for span in pred_spans:
            if span in gold_spans:
                tp[span[0]] += 1
            else:
                fp[span[0]] += 1
        for span in gold_spans:
            if span not in pred_spans:
                fn[span[0]] += 1

    per_type = {}
    total_tp = total_fp = total_fn = 0
    for etype in entity_types:
        t, f_p, f_n = tp.get(etype, 0), fp.get(etype, 0), fn.get(etype, 0)
        support = t + f_n
        precision = t / (t + f_p) if (t + f_p) > 0 else 0.0
        recall = t / (t + f_n) if (t + f_n) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        per_type[etype] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1-score": round(f1, 4),
            "support": support,
        }
        total_tp += t
        total_fp += f_p
        total_fn += f_n

    micro_p = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    micro_r = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    micro_f1 = (2 * micro_p * micro_r / (micro_p + micro_r)) if (micro_p + micro_r) > 0 else 0.0

    return {
        "perType": per_type,
        "micro": {
            "precision": round(micro_p, 4),
            "recall": round(micro_r, 4),
            "f1-score": round(micro_f1, 4),
            "support": total_tp + total_fn,
        },
    }
