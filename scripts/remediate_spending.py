#!/usr/bin/env python3
"""
remediate_spending.py — apply the reviewed SPENDING_ANALYSIS remediation map.

MOVE (relabel), REWORD, and CROSS-FILE moves — NEVER blind delete. Every entry
was hand-reviewed (see SPENDING_REMEDIATION_MAP.md); the auto-classifier's
weak-word mis-assignments (above-average→AVERAGES, more-than-usual→COMPARISON)
are corrected here.

Idempotent: matches exact pattern strings; a second run is a no-op. Writes the
two spec files in place. Run the linter afterwards to confirm hard=0.

Usage: python3 scripts/remediate_spending.py [--dry-run]
"""
import json, sys

DRY = '--dry-run' in sys.argv
SPEND = 'src/knowledge/specs/SPENDING_ANALYSIS.intent.json'
BUDGET = 'src/knowledge/specs/BUDGET_PLANNING.intent.json'

# ── MOVES within SPENDING_ANALYSIS: (from_bucket, pattern) -> to_bucket ────────
MOVES = {
    'ANOMALY_DETECTION': {
        'SUMMARY': [
            "give me insights on my spending",
            "outline any seasonal patterns in my spending habits",
            "what can you tell me about my spending this month",
            "find any noticeable patterns in my recent transactions",
            "analyze my expense for {PERIOD} and suggest savings opportunities",
            "highlight any seasonal shifts in my {CATEGORY} spending pattern",
            "any insights on my spending {PERIODSHORT}",
            "what insights do you have about my expenses",
            "insights into my {CATEGORY} spending",
            "spending insights for {PERIODSHORT}",
            "show me some insights about my money habits",
            "got any insights on where my money went {PERIODSHORT}",
            "meri spending insights dikhao {PERIOD}",
            "meri monthly spending ka summary {PERIOD}",
            "can you detect any seasonal shifts in my {CATEGORY} spending over {PERIOD}",
            "do you see any pattern of late payments that could be costing me interest",
            "are there any indirect fees in my {CATEGORY} purchases that I haven't noticed",
            "what does my latest monthly statement reveal about my spending habits",
            "spot any hidden patterns in my monthly {CATEGORY} expenses",
            "let me know if my exposure to {CATEGORY} is above average",
            "check if my {CATEGORY} spending aligns with the budget I set",
        ],
        'COMPARISON': [
            "what does my spending look like compared to the same time last year",
            "how does my current month compare to last month in terms of {CATEGORY} outlays",
            "compare my current spending to previous month and highlight differences",
            "compare my {CATEGORY} purchases to my average over the last {PERIOD}",
        ],
        'TREND': [
            "I want to see if my expenses are trending up or down this month",
            "can you summarize my {CATEGORY} spend trend over the last {PERIOD}",
            "which {CATEGORY} category shows the biggest growth trend over the past {PERIOD}",
        ],
        'TOP_SPENDERS': [
            "share any insights on where most of my money goes during {PERIOD}",
            "give me a rundown of my biggest {CATEGORY} expenses over the last {PERIOD}",
        ],
    },
    'ROOT_CAUSE': {
        'BREAKDOWN': [
            "where is my money going {DATE}",
            "show me the breakdown of my {CATEGORY} spends for {PERIODSHORT}",
        ],
        'SUMMARY': [
            "analyze my spending {PERIODSHORT}",
            "analyse my {CATEGORY} spend {PERIODSHORT}",
            "give me an analysis of my expenses {PERIODSHORT}",
            "do an analysis on my {CATEGORY} costs",
            "analyze where my money went {PERIODSHORT}",
        ],
        'ANOMALY_DETECTION': [
            "kiye {CATEGORY} mein 23₹ extra charge lag raha hai?",
        ],
        'TOP_SPENDERS': [
            "identify the top merchants responsible for my {CATEGORY} outlays in {PERIOD}",
            "show me the main contributors to my {CATEGORY} outlays during {PERIOD}",
            "show me the biggest contributors to my {CATEGORY} outlays during {PERIOD}",
            "where can I see the biggest contributors to my {CATEGORY} expenses",
            "which merchants are the biggest culprits behind my {CATEGORY} costs",
            "what are the biggest contributors to my {CATEGORY} outlay this month",
            "which expenses in {CATEGORY} are the biggest contributors this {PERIOD}",
        ],
    },
    'TOP_SPENDERS': {
        'ANOMALY_DETECTION': [
            "flag any unusual large purchases at {MERCHANT}",
            "detect any anomalies with my vendor {MERCHANT}",
            "let me know if any {MERCHANT} is pulling more than usual",
            "can you flag any merchant where my spend has suddenly doubled recently",
            "is there any merchant where my average monthly spend is increasing",
            "can you highlight any merchant that repeatedly charges me unexpectedly",
            "can you surface any merchant that deviates from my typical spending pattern",
        ],
        'SUBSCRIPTIONS': [
            "check if I should consider canceling a subscription at {MERCHANT}",
        ],
    },
}

# ── REWORDS within SPENDING_ANALYSIS: (bucket, old) -> new (same bucket) ───────
# budget→spending (Item 5) + top-merchant patterns that also said "budget" +
# "spike"→"driving" for the one moved to TOP_SPENDERS + BREAKDOWN chart phrasing.
REWORDS = {
    'ROOT_CAUSE': {
        "what is eating my budget {PERIOD}": "what is eating into my spending {PERIOD}",
        "what is draining my {CATEGORY} budget {PERIOD}": "what is draining my {CATEGORY} spending {PERIOD}",
        "what is eating my {CATEGORY} budget {PERIOD}": "what is eating into my {CATEGORY} spending {PERIOD}",
        "what is causing my {CATEGORY} budget to disappear": "what is causing my {CATEGORY} spending to climb",
        "which expenditure patterns drive my {CATEGORY} budget": "which expenditure patterns drive my {CATEGORY} spending",
        "how can I identify the factor skewing my {CATEGORY} budget this week": "how can I identify the factor skewing my {CATEGORY} spending this week",
        "mera budget {CATEGORY} pe kyun khatam ho raha hai?": "{CATEGORY} pe itna kharcha kyun ho raha hai?",
        "analyse my {CATEGORY} budget burn {PERIOD}": "analyse my {CATEGORY} spending {PERIOD}",  # then MOVE→SUMMARY below
    },
    'BREAKDOWN': {
        "Can I see a chart of where my money went in {PERIOD}": "Can I see a breakdown of where my money went in {PERIOD}",
    },
    'TREND': {
        "Will my {CATEGORY} spending be higher or lower next month based on its pattern over {PERIOD}":
            "Will my {CATEGORY} spending rise or fall next month based on its trend over {PERIOD}",
    },
    # Bare two-category SUMMARY → prefix "combined" (user decision: additive default).
    'SUMMARY': {
        "my spending on {CATEGORY1} and {CATEGORY2} {PERIODSHORT}": "my combined spending on {CATEGORY1} and {CATEGORY2} {PERIODSHORT}",
        "what went to {CATEGORY1} and {CATEGORY2} {PERIODSHORT}": "the combined total that went to {CATEGORY1} and {CATEGORY2} {PERIODSHORT}",
        "my {CATEGORY1} and {CATEGORY2} bills {PERIODSHORT}": "my combined {CATEGORY1} and {CATEGORY2} bills {PERIODSHORT}",
        "{PERIODSHORT} spending on {CATEGORY1} and {CATEGORY2}": "{PERIODSHORT} combined spending on {CATEGORY1} and {CATEGORY2}",
        "my {CATEGORY1} and {CATEGORY2} spend, {PERIODSHORT}": "my combined {CATEGORY1} and {CATEGORY2} spend, {PERIODSHORT}",
        "spending on {CATEGORY1} and {CATEGORY2} {PERIODSHORT}": "combined spending on {CATEGORY1} and {CATEGORY2} {PERIODSHORT}",
        "{MERCHANT1} and {MERCHANT2} spending {PERIODSHORT}": "combined {MERCHANT1} and {MERCHANT2} spending {PERIODSHORT}",
        "my {MERCHANT1} and {MERCHANT2} spend {PERIODSHORT}": "my combined {MERCHANT1} and {MERCHANT2} spend {PERIODSHORT}",
    },
}

# Reword-then-move (applies reword in ROOT_CAUSE, then relocates the NEW text).
REWORD_THEN_MOVE = {
    'ROOT_CAUSE': {
        # new text after reword : target bucket
        "analyse my {CATEGORY} spending {PERIOD}": "SUMMARY",
    },
}

# ── CROSS-FILE move: SPENDING/ROOT_CAUSE -> BUDGET_PLANNING/STATUS ─────────────
CROSS_FILE = [
    ("why did my {CATEGORY} budget exceed last {PERIOD}", "ROOT_CAUSE", "STATUS"),
]


def apply_moves(up, log):
    for src, targets in MOVES.items():
        for dst, pats in targets.items():
            for p in pats:
                if p in up.get(src, []):
                    up[src].remove(p)
                    up.setdefault(dst, []).append(p)
                    log.append(f"MOVE  {src}->{dst}: {p}")
                elif p not in up.get(dst, []):
                    log.append(f"WARN  not found for move ({src}->{dst}): {p}")

def apply_rewords(up, log):
    for bucket, mapping in REWORDS.items():
        arr = up.get(bucket, [])
        for old, new in mapping.items():
            if old in arr:
                arr[arr.index(old)] = new
                log.append(f"REWORD {bucket}: {old}  ->  {new}")
            elif new not in arr:
                log.append(f"WARN  not found for reword ({bucket}): {old}")

def apply_reword_then_move(up, log):
    for src, mapping in REWORD_THEN_MOVE.items():
        for text, dst in mapping.items():
            if text in up.get(src, []):
                up[src].remove(text)
                up.setdefault(dst, []).append(text)
                log.append(f"MOVE(after reword) {src}->{dst}: {text}")

def main():
    spend = json.load(open(SPEND))
    up = spend['utterance_patterns']
    log = []

    apply_rewords(up, log)            # reword first (so reword-then-move text exists)
    apply_reword_then_move(up, log)
    apply_moves(up, log)

    # Cross-file
    budget = json.load(open(BUDGET))
    bup = budget['utterance_patterns']
    for pat, src, dst in CROSS_FILE:
        if pat in up.get(src, []):
            up[src].remove(pat)
            bup.setdefault(dst, []).append(pat)
            log.append(f"CROSS-FILE SPENDING/{src} -> BUDGET/{dst}: {pat}")
        else:
            log.append(f"WARN  not found for cross-file: {pat}")

    print('\n'.join(log))
    print(f"\n=== {len([l for l in log if not l.startswith('WARN')])} ops, "
          f"{len([l for l in log if l.startswith('WARN')])} warnings ===")
    sizes = {k: len(v) for k, v in up.items()}
    print("New SPENDING bucket sizes:", sizes, "total", sum(sizes.values()))

    if DRY:
        print("\n(dry-run — no files written)")
        return
    json.dump(spend, open(SPEND, 'w'), indent=2, ensure_ascii=False)
    json.dump(budget, open(BUDGET, 'w'), indent=2, ensure_ascii=False)
    print("\nWrote", SPEND, "and", BUDGET)

if __name__ == '__main__':
    main()
