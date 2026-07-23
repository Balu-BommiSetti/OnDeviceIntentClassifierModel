#!/usr/bin/env python3
"""
remediate_spending_r3.py — round-3: fixes found by a full manual line-by-line
read of SPENDING_ANALYSIS.intent.json (post R1/R2), requested by the user
specifically to catch what keyword-only linting missed:
  1. Literal amounts instead of {AMOUNT}/{PLAINAMOUNT}/{PERIOD} placeholders.
  2. Degenerate bare single-word patterns (weak/risky training signal).
  3. Wrong-bucket drift WITHIN SPENDING_ANALYSIS (patterns that don't ask for
     what their taskType actually answers — e.g. "seasonal patterns" landed in
     SUMMARY during R1 but means TREND, not a total).
  4. Cross-INTENT leaks (late-payment interest -> DEBT_FREEDOM; "budget I set"
     / "cross my limit" -> BUDGET_PLANNING; "kitna bacha" -> SAVINGS_ADVICE).
  5. Systemic "budget"-as-synonym-for-"spending" reword (18 occurrences).
Idempotent. Run the linter after to confirm hard=0 and re-run dataset:generate
+ dataset:validate to confirm structural integrity.
"""
import json, sys

DRY = '--dry-run' in sys.argv
SPEND = 'src/knowledge/specs/SPENDING_ANALYSIS.intent.json'
DEBT = 'src/knowledge/specs/DEBT_FREEDOM_ANALYSIS.intent.json'
BUDGET = 'src/knowledge/specs/BUDGET_PLANNING.intent.json'
SAVINGS = 'src/knowledge/specs/SAVINGS_ADVICE.intent.json'

# ── 1. Literal amount / date fixes (reword in place, same bucket) ─────────────
REWORDS_SPEND = {
    'ROOT_CAUSE': {
        "mere ek transaction {MERCHANT} ke liye 8.5k ka fee kyun?":
            "mere ek transaction {MERCHANT} ke liye {PLAINAMOUNT} ka fee kyun?",
        "clarify why my {CATEGORY} expenses climbed in the last 30 days":
            "clarify why my {CATEGORY} expenses climbed in the last {PERIOD}",
    },
    'ANOMALY_DETECTION': {
        # was also broken Hindi grammar ("kiye X mein" isn't valid — "kya X mein" is).
        "kiye {CATEGORY} mein 23₹ extra charge lag raha hai?":
            "kya {CATEGORY} mein {PLAINAMOUNT} ka extra charge lag raha hai?",
    },
    # 2. Bare degenerate single-word patterns — delete (not move; they carry no
    # context and "budget" alone is a straight collision risk with BUDGET_PLANNING).
    # Handled as deletions below, not in this reword map.

    # 5. Systemic "budget" -> "spending" reword (budget used as a loose synonym).
    'BREAKDOWN': {
        "display the breakdown of my budget by category for {PERIOD}":
            "display the breakdown of my spending by category for {PERIOD}",
    },
    'COMPARISON': {
        "how does my {CATEGORY} budget change from {PERIOD1} to {PERIOD2}":
            "how does my {CATEGORY} spending change from {PERIOD1} to {PERIOD2}",
        "compare my {CATEGORY} budget status from {PERIOD1} up to {PERIOD2}":
            "compare my {CATEGORY} spending from {PERIOD1} up to {PERIOD2}",
        "show me how my {CATEGORY} budget shifted between {PERIOD1} and {PERIOD2}":
            "show me how my {CATEGORY} spending shifted between {PERIOD1} and {PERIOD2}",
        "compare my {CATEGORY} budgeting reality from {PERIOD1} to {PERIOD2}":
            "compare my actual {CATEGORY} spending from {PERIOD1} to {PERIOD2}",
    },
    'SUBSCRIPTIONS': {
        "would you spot any recurring charges I keep missing from my budget":
            "would you spot any recurring charges I keep missing from my statements",
    },
}
REWORDS_ROOT_CAUSE_PLURAL = {
    "why have my {CATEGORY} budgets been hit by higher fees this month":
        "why have my {CATEGORY} expenses been hit by higher fees this month",
}

REWORDS_ANOMALY = {
    "help me spot any big spikes in my {CATEGORY} budget":
        "help me spot any big spikes in my {CATEGORY} spending",
    "does my recent budget show any hidden spikes":
        "does my recent spending show any hidden spikes",
    "Which categories had spikes in my budget for {PERIOD}":
        "Which categories had spikes in my spending for {PERIOD}",
    "Help me flag anomalies in my budget for {PERIOD}":
        "Help me flag anomalies in my spending for {PERIOD}",
    "Check my budget for anomalies on {DATE}":
        "Check my spending for anomalies on {DATE}",
    "check for budgeting anomalies related to {CATEGORY} over {PERIOD}":
        "check for spending anomalies related to {CATEGORY} over {PERIOD}",
    "report on spending deviations in my budget for {PERIOD}":
        "report on spending deviations for {PERIOD}",
    "Show me any anomalies in my budget for {PERIOD}":
        "Show me any anomalies in my spending for {PERIOD}",
    "Do I have any odd events in my budget over {PERIOD}":
        "Do I have any odd events in my spending over {PERIOD}",
    "Are there any unusual trends in my budget for {PERIOD}":
        "Are there any unusual trends in my spending for {PERIOD}",
}

# Bare single-word patterns to DELETE (SUMMARY). Only "budget" — a lone
# ambiguous cross-intent token, not real coverage. "spending"/"expenses"/
# "money" are kept: terse but not cross-intent-ambiguous on their own.
DELETE = {
    'SUMMARY': ["budget"],
}

# 3. Wrong-bucket moves WITHIN SPENDING_ANALYSIS (found on manual read + the
# linter's SUMMARY-blind-spot fix).
MOVES_WITHIN = {
    'SUMMARY': {
        'TREND': [
            "outline any seasonal patterns in my spending habits",
            "highlight any seasonal shifts in my {CATEGORY} spending pattern",
            "find any noticeable patterns in my recent transactions",
            "can you detect any seasonal shifts in my {CATEGORY} spending over {PERIOD}",
            "spot any hidden patterns in my monthly {CATEGORY} expenses",
        ],
        'BREAKDOWN': [
            "got any insights on where my money went {PERIODSHORT}",
            "analyze where my money went {PERIODSHORT}",
            "Break down my spending by {CATEGORY} for {PERIOD}",
            "Show me how much I spent by category during {PERIOD}",
        ],
        'AVERAGES': [
            "let me know if my exposure to {CATEGORY} is above average",
        ],
        'SUBSCRIPTIONS': [
            "are there any indirect fees in my {CATEGORY} purchases that I haven't noticed",
        ],
    },
}

# 4. Cross-INTENT moves (out of SPENDING_ANALYSIS entirely).
CROSS_FILE = [
    # (pattern, from_bucket, to_file, to_bucket)
    ("do you see any pattern of late payments that could be costing me interest",
     "SUMMARY", DEBT, "RISK"),
    ("check if my {CATEGORY} spending aligns with the budget I set",
     "SUMMARY", BUDGET, "STATUS"),
    ("did I cross my {CATEGORY} limit {PERIODSHORT}?",
     "SUMMARY", BUDGET, "STATUS"),
    ("Kitna bacha {PERIOD}?",
     "SUMMARY", SAVINGS, "SUMMARY"),
    ("How much should I budget for {CATEGORY} on average per month",
     "AVERAGES", BUDGET, "ALLOCATION"),
]


def apply_rewords(up, mapping, log):
    for bucket, m in mapping.items():
        arr = up.get(bucket, [])
        for old, new in m.items():
            if old in arr:
                arr[arr.index(old)] = new
                log.append(f"REWORD {bucket}: {old}  ->  {new}")
            elif new not in arr:
                log.append(f"WARN reword not found ({bucket}): {old}")

def apply_flat_rewords(arr_name, up, mapping, log):
    arr = up.get(arr_name, [])
    for old, new in mapping.items():
        if old in arr:
            arr[arr.index(old)] = new
            log.append(f"REWORD {arr_name}: {old}  ->  {new}")
        elif new not in arr:
            log.append(f"WARN reword not found ({arr_name}): {old}")

def apply_deletes(up, log):
    for bucket, items in DELETE.items():
        arr = up.get(bucket, [])
        for item in items:
            if item in arr:
                arr.remove(item)
                log.append(f"DELETE {bucket}: '{item}' (bare/degenerate, cross-intent risk)")
            else:
                log.append(f"WARN delete target not found ({bucket}): '{item}'")

def apply_moves_within(up, log):
    for src, targets in MOVES_WITHIN.items():
        for dst, pats in targets.items():
            for p in pats:
                if p in up.get(src, []):
                    up[src].remove(p)
                    up.setdefault(dst, []).append(p)
                    log.append(f"MOVE {src}->{dst}: {p}")
                elif p not in up.get(dst, []):
                    log.append(f"WARN move-within not found ({src}->{dst}): {p}")

def apply_cross_file(spend_up, files, log):
    for pat, src, to_file, dst in CROSS_FILE:
        if pat in spend_up.get(src, []):
            spend_up[src].remove(pat)
            target = files[to_file]
            target['utterance_patterns'].setdefault(dst, []).append(pat)
            log.append(f"CROSS-FILE SPENDING/{src} -> {to_file}/{dst}: {pat}")
        else:
            log.append(f"WARN cross-file not found: {pat}")

def main():
    spend = json.load(open(SPEND))
    up = spend['utterance_patterns']
    log = []

    apply_rewords(up, REWORDS_SPEND, log)
    apply_flat_rewords('ROOT_CAUSE', up, REWORDS_ROOT_CAUSE_PLURAL, log)
    apply_flat_rewords('ANOMALY_DETECTION', up, REWORDS_ANOMALY, log)
    apply_deletes(up, log)
    apply_moves_within(up, log)

    files = {
        DEBT: json.load(open(DEBT)),
        BUDGET: json.load(open(BUDGET)),
        SAVINGS: json.load(open(SAVINGS)),
    }
    apply_cross_file(up, files, log)

    print('\n'.join(log))
    n_ops = len([l for l in log if not l.startswith('WARN')])
    n_warn = len([l for l in log if l.startswith('WARN')])
    print(f"\n=== {n_ops} ops, {n_warn} warnings ===")
    sizes = {k: len(v) for k, v in up.items()}
    print("SPENDING sizes:", sizes, "total", sum(sizes.values()))

    if DRY:
        print("\n(dry-run — no files written)")
        return

    json.dump(spend, open(SPEND, 'w'), indent=2, ensure_ascii=False)
    for path, data in files.items():
        json.dump(data, open(path, 'w'), indent=2, ensure_ascii=False)
    print("\nWrote", SPEND, "and", ", ".join(files.keys()))

if __name__ == '__main__':
    main()
