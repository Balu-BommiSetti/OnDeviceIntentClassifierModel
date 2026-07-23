#!/usr/bin/env python3
"""
remediate_spending_r2.py — round-2 deltas after the linter surfaced the
remaining mislabels (contributing→TOP_SPENDERS/BREAKDOWN, spike-cause reworded,
Hindi growth→COMPARISON). Idempotent. Run linter after to confirm hard=0.
"""
import json, sys
DRY = '--dry-run' in sys.argv
SPEND = 'src/knowledge/specs/SPENDING_ANALYSIS.intent.json'

# reword-in-place (same bucket)
REWORDS = {
    'ROOT_CAUSE': {
        "what made my {CATEGORY} bill spike": "what made my {CATEGORY} bill get so high",
        "what accounts for the spike in my {CATEGORY} spending": "what is driving the increase in my {CATEGORY} spending",
    },
    'ANOMALY_DETECTION': {
        "is there any merchant where my average monthly spend is increasing":
            "is there any merchant where my monthly spend is rising unexpectedly",
    },
}

# reword THEN move (old text in ROOT_CAUSE -> new text in target bucket)
REWORD_MOVE = [
    ("ROOT_CAUSE", "reveal the top merchants that spike my {CATEGORY} spend recently",
     "reveal the top merchants for my {CATEGORY} spend recently", "TOP_SPENDERS"),
    ("ROOT_CAUSE", "what is the biggest drain on my {CATEGORY} budget",
     "what is the biggest drain on my {CATEGORY} spending", "TOP_SPENDERS"),
    ("ROOT_CAUSE", "what parts of my {CATEGORY} budget are the biggest contributors",
     "what parts of my {CATEGORY} spending are the biggest contributors", "TOP_SPENDERS"),
]

# plain move (no reword)
MOVES = [
    ("ROOT_CAUSE", "tell me which categories and merchants are contributing most to my {CATEGORY} costs", "TOP_SPENDERS"),
    ("ROOT_CAUSE", "which {MERCHANT} contributes most to my {CATEGORY} spending", "TOP_SPENDERS"),
    ("ROOT_CAUSE", "how much is my {CATEGORY} spending contributing to my overall expenses", "BREAKDOWN"),
    ("ROOT_CAUSE", "mere total {CATEGORY} expenses 45k se 1.2 lakh badh gaye kya?", "COMPARISON"),
]

def main():
    spend = json.load(open(SPEND)); up = spend['utterance_patterns']; log = []
    for bucket, m in REWORDS.items():
        arr = up.get(bucket, [])
        for old, new in m.items():
            if old in arr: arr[arr.index(old)] = new; log.append(f"REWORD {bucket}: {old} -> {new}")
            elif new not in arr: log.append(f"WARN reword not found {bucket}: {old}")
    for src, old, new, dst in REWORD_MOVE:
        if old in up.get(src, []):
            up[src].remove(old); up.setdefault(dst, []).append(new)
            log.append(f"REWORD+MOVE {src}->{dst}: {old} -> {new}")
        elif new not in up.get(dst, []): log.append(f"WARN reword+move not found: {old}")
    for src, pat, dst in MOVES:
        if pat in up.get(src, []):
            up[src].remove(pat); up.setdefault(dst, []).append(pat)
            log.append(f"MOVE {src}->{dst}: {pat}")
        elif pat not in up.get(dst, []): log.append(f"WARN move not found: {pat}")
    print('\n'.join(log))
    sizes = {k: len(v) for k, v in up.items()}
    print("sizes:", sizes, "total", sum(sizes.values()))
    if not DRY:
        json.dump(spend, open(SPEND, 'w'), indent=2, ensure_ascii=False)
        print("wrote", SPEND)

if __name__ == '__main__': main()
