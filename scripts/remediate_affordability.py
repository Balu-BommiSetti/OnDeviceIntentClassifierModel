#!/usr/bin/env python3
"""
remediate_affordability.py — AFFORDABILITY_CHECK spec fixes from the line-by-line
review. TOUCHES ONLY AFFORDABILITY_CHECK.intent.json (SPENDING_ANALYSIS and
DEBT_FREEDOM are deliberately NOT modified).

What it does:
  1. Placeholder fix: {PLAINAMOUNT} -> {AMOUNT} (undeclared placeholder).
  2. Delete 18 WHAT_IF patterns that are prepayment / existing-debt scenarios —
     NOT affordability of a NEW purchase. They collide with DEBT_FREEDOM/WHAT_IF,
     which ALREADY covers "add {EXTRAPAYMENT} to my {LIABILITYTYPE}" with 74
     patterns. They are synthetic near-duplicates of coverage that already
     exists there, so moving them would only spam DEBT_FREEDOM; deleting loses
     no real coverage. (The 2 genuine new-purchase financing what-ifs — "took
     out a loan for {AMOUNT}...", "switched to a higher rate...for a {AMOUNT}
     loan" — are KEPT.)
  3. Add FREQUENCY + TARGETDATE to optional_entities (both are EXISTING trained
     slots — FREQUENCY: monthly/yearly/…, TARGETDATE: in 6 months/by December/…).
     No new model slot label is introduced.
  4. Add recurring-affordability (FREQUENCY) and future-affordability
     (TARGETDATE) patterns to ANALYSIS — the two dangerous gaps from the audit
     ("can I afford a $150/mo gym", "can I afford a $5k trip in 6 months").
  5. Backfill WHAT_IF (financing/recurring/future hypotheticals) to stay above
     the 40-skeleton floor after the deletions.

Idempotent. Run dataset:generate + dataset:validate after.
"""
import json, sys

DRY = '--dry-run' in sys.argv
SPEC = 'src/knowledge/specs/AFFORDABILITY_CHECK.intent.json'

REWORDS = {
    'ANALYSIS': {
        "Kya {MERCHANT} se {PLAINAMOUNT} ka {CATEGORY} kharidna affordable hai?":
            "Kya {MERCHANT} se {AMOUNT} ka {CATEGORY} kharidna affordable hai?",
    },
}

# 18 prepay / existing-debt patterns to remove from WHAT_IF (synthetic dupes of
# DEBT_FREEDOM/WHAT_IF; not new-purchase affordability).
DELETE_WHATIF = [
    "what if I increased my monthly payment by {AMOUNT} on a {CATEGORY} loan",
    "imagine i added an extra {AMOUNT} into my {CATEGORY} payment plan",
    "how would my finances look if i allocated {AMOUNT} extra to a {CATEGORY} order",
    "suppose i increased my payment by {AMOUNT} for a {CATEGORY} from {MERCHANT}",
    "if i put an additional {AMOUNT} toward a {CATEGORY} expense",
    "what happens if i allocate {AMOUNT} more to a {CATEGORY} transaction",
    "how would my cash flow change if i added {AMOUNT} extra to a {CATEGORY}",
    "what would my balance be if i added {AMOUNT} more to a {CATEGORY} bill",
    "what if i give {AMOUNT} more toward a {CATEGORY} due date on {DATE}",
    "how would it look if i contributed an extra {AMOUNT} towards a {CATEGORY} debt",
    "what if I add {AMOUNT} to my {CATEGORY} payment",
    "what if I increase my {CATEGORY} payment by {AMOUNT}",
    "what if I add {AMOUNT} more to a {CATEGORY} loan",
    "what if I contribute {AMOUNT} more to a {CATEGORY} expense on {DATE}",
    "what if I apply an additional {AMOUNT} to my {CATEGORY} debt",
    "what if I allocate {AMOUNT} extra to a {CATEGORY} from {MERCHANT}",
    "what if I pay {AMOUNT} more each month for a {CATEGORY} loan",
    "what if I include {AMOUNT} extra toward a {CATEGORY} transaction",
]

ADD_ENTITIES = ["FREQUENCY", "TARGETDATE"]

# Recurring (FREQUENCY) + future (TARGETDATE) affordability — the audit's gaps.
ADD_ANALYSIS = [
    # recurring commitment affordability
    "can I afford a {AMOUNT} {FREQUENCY} {CATEGORY} subscription",
    "can I afford to pay {AMOUNT} {FREQUENCY} for {CATEGORY}",
    "is a {AMOUNT} {FREQUENCY} {CATEGORY} membership within my budget",
    "can my cash flow handle a {AMOUNT} {FREQUENCY} {CATEGORY} commitment",
    "should I sign up for a {AMOUNT} {FREQUENCY} {CATEGORY} plan",
    "will a {AMOUNT} {FREQUENCY} {CATEGORY} charge fit my monthly budget",
    "can I take on a {AMOUNT} {FREQUENCY} {CATEGORY} bill without straining my finances",
    "is a recurring {AMOUNT} {CATEGORY} payment affordable for me {FREQUENCY}",
    "kya main {AMOUNT} {FREQUENCY} ka {CATEGORY} afford kar sakta hoon?",
    # future / time-bound affordability
    "can I afford a {AMOUNT} {CATEGORY} {TARGETDATE}",
    "will I be able to afford a {AMOUNT} {CATEGORY} {TARGETDATE}",
    "if I keep saving, can I afford a {AMOUNT} {CATEGORY} {TARGETDATE}",
    "am I on track to afford a {AMOUNT} {CATEGORY} {TARGETDATE}",
    "will a {AMOUNT} {CATEGORY} be within my reach {TARGETDATE}",
    "can I save enough for a {AMOUNT} {CATEGORY} {TARGETDATE}",
    "kya main {TARGETDATE} tak {AMOUNT} ka {CATEGORY} afford kar paunga?",
]

# WHAT_IF backfill — new-purchase financing + recurring/future hypotheticals.
ADD_WHATIF = [
    "what if I financed a {AMOUNT} {CATEGORY} over {TENUREMONTHS} instead of paying cash",
    "what if I put {DOWNPAYMENT} down on a {AMOUNT} {CATEGORY} at {INTERESTRATE}",
    "what if I bought a {AMOUNT} {CATEGORY} on EMI for {TENUREMONTHS}",
    "how would a {AMOUNT} {CATEGORY} affect me if the rate were {INTERESTRATE}",
    "what if I waited and saved for a {AMOUNT} {CATEGORY} until {TARGETDATE}",
    "what if I bought a {AMOUNT} {CATEGORY} now versus {TARGETDATE}",
    "what if I committed to a {AMOUNT} {FREQUENCY} {CATEGORY} plan",
    "what if a {AMOUNT} {CATEGORY} subscription renewed {FREQUENCY}",
    "what if I stretched a {AMOUNT} {CATEGORY} over {TENUREMONTHS} at {INTERESTRATE}",
    "what if I paid cash for a {AMOUNT} {CATEGORY} instead of financing it",
    "what if I financed a {AMOUNT} {CATEGORY} with no down payment",
    "agar main {AMOUNT} ka {CATEGORY} {TENUREMONTHS} me EMI pe lu to kya hoga?",
]


def main():
    d = json.load(open(SPEC))
    up = d['utterance_patterns']
    log = []

    # 1. rewords
    for bucket, m in REWORDS.items():
        arr = up[bucket]
        for old, new in m.items():
            if old in arr:
                arr[arr.index(old)] = new
                log.append(f"REWORD {bucket}: {old} -> {new}")
            elif new not in arr:
                log.append(f"WARN reword not found: {old}")

    # 2. deletes
    for p in DELETE_WHATIF:
        if p in up['WHAT_IF']:
            up['WHAT_IF'].remove(p)
            log.append(f"DELETE WHAT_IF: {p}")
        else:
            log.append(f"WARN delete not found: {p}")

    # 3. entities
    for e in ADD_ENTITIES:
        if e not in d['optional_entities']:
            d['optional_entities'].append(e)
            log.append(f"ADD entity: {e}")

    # 4/5. additions (skip if already present — idempotent)
    for p in ADD_ANALYSIS:
        if p not in up['ANALYSIS']:
            up['ANALYSIS'].append(p); log.append(f"ADD ANALYSIS: {p}")
    for p in ADD_WHATIF:
        if p not in up['WHAT_IF']:
            up['WHAT_IF'].append(p); log.append(f"ADD WHAT_IF: {p}")

    print('\n'.join(log))
    n_ops = len([l for l in log if not l.startswith('WARN')])
    n_warn = len([l for l in log if l.startswith('WARN')])
    print(f"\n=== {n_ops} ops, {n_warn} warnings ===")
    print("bucket sizes:", {k: len(v) for k, v in up.items()})
    print("optional_entities:", d['optional_entities'])

    if DRY:
        print("\n(dry-run — no file written)")
        return
    json.dump(d, open(SPEC, 'w'), indent=2, ensure_ascii=False)
    print("\nWrote", SPEC)


if __name__ == '__main__':
    main()
