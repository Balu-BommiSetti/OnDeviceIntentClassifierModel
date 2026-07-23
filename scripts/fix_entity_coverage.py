#!/usr/bin/env python3
"""
fix_entity_coverage.py — pre-training entity-coverage audit fixes, found via a
full-dataset per-(intent, entity) tagged-occurrence sweep before this training
run. TOUCHES ONLY: INCOME_ANALYSIS, SIP_VS_PREPAY, INCOME_DECLARATION,
SAVINGS_ADVICE, LOAN_ANALYSIS. None of these were touched by the SPENDING_
ANALYSIS or AFFORDABILITY_CHECK remediation work — this is a pre-existing gap
this audit happened to surface.

1. INCOME_ANALYSIS.AMOUNT: declared optional but ZERO patterns anywhere used
   {AMOUNT} — a threshold query ("did I earn more than 50k") had no training
   signal to ever extract the amount. Adds real patterns.
2. SIP_VS_PREPAY.INTERESTRATE2: a spec-hygiene bug, not a real gap. Numbered
   role slots (mirrors PERIOD1/PERIOD2) are NEVER declared in optional_
   entities — only the base type is (the generator tags both occurrences as
   the base INTERESTRATE; role assignment, if needed, is a downstream app
   concern, same as periodRoles.ts for PERIOD1/PERIOD2). SPENDING_ANALYSIS
   correctly declares only "PERIOD", never "PERIOD1"/"PERIOD2" — SIP_VS_PREPAY
   incorrectly declared "INTERESTRATE2" itself. Removes the stray entry.
3-5. INCOME_ANALYSIS.DATE (6 occurrences), INCOME_DECLARATION.DATE (8),
   SAVINGS_ADVICE.DATE (3), LOAN_ANALYSIS.EXTRAPAYMENT (2): each had exactly
   ONE raw pattern using the entity — a training signal too thin to learn
   reliably. Backfills a few more patterns each.

Idempotent. Run dataset:generate + dataset:validate after, then re-run the
coverage audit to confirm every declared entity clears a healthy floor.
"""
import json, sys

DRY = '--dry-run' in sys.argv
SPECS_DIR = 'src/knowledge/specs'

# 1. INCOME_ANALYSIS — add AMOUNT-bearing patterns (threshold-style income queries).
ADD_INCOME_ANALYSIS = {
    'SUMMARY': [
        "did I earn more than {AMOUNT} this month",
        "was my income above {AMOUNT} in {PERIOD}",
        "did I make at least {AMOUNT} {PERIOD}",
        "is my income over {AMOUNT} this {PERIOD}",
    ],
    'ANALYSIS': [
        "why did my income fall below {AMOUNT} this month",
        "explain why I earned less than {AMOUNT} in {PERIOD}",
    ],
    'COMPARISON': [
        "did I earn more than {AMOUNT} in {PERIOD1} compared to {PERIOD2}",
    ],
}

# 3. INCOME_ANALYSIS — backfill DATE (was 1 raw pattern / 6 occurrences).
ADD_INCOME_ANALYSIS_DATE = {
    'SUMMARY': [
        "how much did I earn on {DATE}",
        "what was my income on {DATE}",
    ],
    'ANALYSIS': [
        "why was my income different on {DATE}",
    ],
}

# 4. INCOME_DECLARATION — backfill DATE (was 1 raw pattern / 8 occurrences).
# Reworded after a collision check against ADD_INCOME (a DIFFERENT intent —
# "money received" transactions) surfaced 3 near-duplicates with the first
# draft ("set my income to X starting DATE" etc. read as ADD_INCOME's
# transactional framing). INCOME_DECLARATION is a recurring BASE/PLANNING
# salary update, not a received payment — reworded to say so explicitly.
ADD_INCOME_DECLARATION_DATE = {
    'CREATE': [
        "update my base salary to {AMOUNT}, effective {DATE}",
        "my recurring monthly income is now {AMOUNT} starting {DATE}",
        "my new base planning income is {AMOUNT}, starting {DATE}",
    ],
}

# 5. SAVINGS_ADVICE — backfill DATE (was 1 raw pattern / 3 occurrences).
ADD_SAVINGS_ADVICE_DATE = {
    'ANALYSIS': [
        "how much had I saved by {DATE}",
        "was I on track for my savings goal by {DATE}",
        "what did my savings look like on {DATE}",
    ],
}

# 6. LOAN_ANALYSIS — backfill EXTRAPAYMENT (was 1 raw pattern / 2 occurrences).
# TERMS-framed only (EMI/burden impact), never "sooner/finish/payoff/clear" —
# this spec has an explicit, previously-fixed boundary rule: LOAN_ANALYSIS
# owns loan TERMS (rate, tenure, EMI burden), DEBT_FREEDOM_ANALYSIS owns
# payoff-timeline FREEDOM what-ifs. Using FREEDOM-flavored wording here would
# reintroduce the exact classifier confusion that boundary rule fixed.
ADD_LOAN_ANALYSIS_EXTRAPAYMENT = {
    'WHAT_IF': [
        "what would my new EMI be if I add {EXTRAPAYMENT} to my monthly payment",
        "how does an extra {EXTRAPAYMENT} a month change my loan burden",
        "what if my monthly payment went up by {EXTRAPAYMENT}, what would the new EMI look like",
    ],
}


def add_patterns(spec, mapping, log, intent_name):
    up = spec['utterance_patterns']
    for tt, pats in mapping.items():
        for p in pats:
            if p not in up.get(tt, []):
                up.setdefault(tt, []).append(p)
                log.append(f"ADD {intent_name}/{tt}: {p}")
            else:
                log.append(f"WARN already present {intent_name}/{tt}: {p}")


def main():
    log = []

    # --- INCOME_ANALYSIS: AMOUNT + DATE backfill ---
    path = f'{SPECS_DIR}/INCOME_ANALYSIS.intent.json'
    spec = json.load(open(path))
    add_patterns(spec, ADD_INCOME_ANALYSIS, log, 'INCOME_ANALYSIS')
    add_patterns(spec, ADD_INCOME_ANALYSIS_DATE, log, 'INCOME_ANALYSIS')
    if not DRY:
        json.dump(spec, open(path, 'w'), indent=2, ensure_ascii=False)

    # --- SIP_VS_PREPAY: remove the stray INTERESTRATE2 declaration (hygiene) ---
    path = f'{SPECS_DIR}/SIP_VS_PREPAY.intent.json'
    spec = json.load(open(path))
    if 'INTERESTRATE2' in spec['optional_entities']:
        spec['optional_entities'].remove('INTERESTRATE2')
        log.append("REMOVE SIP_VS_PREPAY optional_entities: INTERESTRATE2 (numbered-role alias, mirrors PERIOD1/PERIOD2 — never declared standalone)")
    else:
        log.append("WARN INTERESTRATE2 not found in SIP_VS_PREPAY optional_entities")
    if not DRY:
        json.dump(spec, open(path, 'w'), indent=2, ensure_ascii=False)

    # --- INCOME_DECLARATION: DATE backfill ---
    path = f'{SPECS_DIR}/INCOME_DECLARATION.intent.json'
    spec = json.load(open(path))
    add_patterns(spec, ADD_INCOME_DECLARATION_DATE, log, 'INCOME_DECLARATION')
    if not DRY:
        json.dump(spec, open(path, 'w'), indent=2, ensure_ascii=False)

    # --- SAVINGS_ADVICE: DATE backfill ---
    path = f'{SPECS_DIR}/SAVINGS_ADVICE.intent.json'
    spec = json.load(open(path))
    add_patterns(spec, ADD_SAVINGS_ADVICE_DATE, log, 'SAVINGS_ADVICE')
    if not DRY:
        json.dump(spec, open(path, 'w'), indent=2, ensure_ascii=False)

    # --- LOAN_ANALYSIS: EXTRAPAYMENT backfill ---
    path = f'{SPECS_DIR}/LOAN_ANALYSIS.intent.json'
    spec = json.load(open(path))
    add_patterns(spec, ADD_LOAN_ANALYSIS_EXTRAPAYMENT, log, 'LOAN_ANALYSIS')
    if not DRY:
        json.dump(spec, open(path, 'w'), indent=2, ensure_ascii=False)

    print('\n'.join(log))
    n_ops = len([l for l in log if not l.startswith('WARN')])
    n_warn = len([l for l in log if l.startswith('WARN')])
    print(f"\n=== {n_ops} ops, {n_warn} warnings ===")
    if DRY:
        print("(dry-run — no files written)")


if __name__ == '__main__':
    main()
