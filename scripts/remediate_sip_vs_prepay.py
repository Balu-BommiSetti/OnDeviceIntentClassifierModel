#!/usr/bin/env python3
"""
remediate_sip_vs_prepay.py — SIP_VS_PREPAY SUMMARY/COMPARISON conflict fix.

Root cause (found via a training-run regression: "should I invest or pay off
my loan first" flipped SUMMARY->COMPARISON at 0.999 conf): SUMMARY was
dominated (44/49 patterns) by bare "X or Y" / "is X better than Y" phrasing
structurally identical to COMPARISON's own patterns — the whole intent is
binary-choice-shaped, so "or" itself can't be a discriminator.

Fix mirrors the proven SPENDING_ANALYSIS pattern: COMPARISON keeps ONLY
patterns with an explicit comparison marker (compare/vs/versus/against/beat/
difference/weigh/stack up/evaluate/measure) — a genuine "show me the numbers
side by side" ask. Everything else (bare "X or Y", "is X better than Y" with
no such marker) moves to SUMMARY, which becomes the residual "give me a
recommendation" bucket — exactly how SUMMARY already works for every other
reviewed intent this session (SPENDING_ANALYSIS, AFFORDABILITY_CHECK).

WHAT_IF checked separately: zero leakage found, no changes needed.

Idempotent. Run dataset:generate + dataset:validate after.
"""
import json, sys

DRY = '--dry-run' in sys.argv
SPEC = 'src/knowledge/specs/SIP_VS_PREPAY.intent.json'

MOVE_TO_SUMMARY = [
    "SIP or prepay my {LIABILITYTYPE}",
    "is SIP better than prepaying my {LIABILITYTYPE}",
    "prepay the {LIABILITYTYPE} or keep investing in SIP",
    "should my surplus go to SIP or my {LIABILITYTYPE}",
    "invest or prepay which gives more",
    "is prepaying my {LIABILITYTYPE} smarter than my SIP",
    "which is the better use of {AMOUNT} SIP or prepayment",
    "SIP compounding or interest saved by prepaying which is bigger",
    "which earns more SIP or clearing my {LIABILITYTYPE}",
    "SIP or foreclosing the {LIABILITYTYPE} which builds more wealth",
    "is my SIP return higher than my {LIABILITYTYPE} rate",
    "which option is better for {AMOUNT} a month SIP or loan",
    "better returns from SIP or interest saved on my {LIABILITYTYPE}",
    "is investing better than prepaying at {INTERESTRATE}",
    "Invest my spare cash or prepay the loan which is better",
    "Which is better to use my spare {AMOUNT} on: a regular investment or an extra loan payment",
    "Is putting {AMOUNT} into a SIP better than using it to prepay a {INTERESTRATE} debt",
    "If I can spare {AMOUNT} weekly, would it be better to invest or prepay my loan",
    "With {PERIOD} left on my loan, should I use the {AMOUNT} for a SIP or prepay",
    "SIP aur prepay se meri {LIABILITYTYPE} pe kaunsa better return milega?",
    "Mere loan ke liye SIP zyada beneficial hai ya prepay, {INTERESTRATE2}% ka interest dekhkar?",
]


def main():
    spec = json.load(open(SPEC))
    up = spec['utterance_patterns']
    log = []

    for p in MOVE_TO_SUMMARY:
        if p in up['COMPARISON']:
            up['COMPARISON'].remove(p)
            up['SUMMARY'].append(p)
            log.append(f"MOVE COMPARISON->SUMMARY: {p}")
        else:
            log.append(f"WARN not found in COMPARISON: {p}")

    print('\n'.join(log))
    n_ops = len([l for l in log if not l.startswith('WARN')])
    n_warn = len([l for l in log if l.startswith('WARN')])
    print(f"\n=== {n_ops} ops, {n_warn} warnings ===")
    sizes = {k: len(v) for k, v in up.items()}
    print("bucket sizes:", sizes, "total", sum(sizes.values()))

    if DRY:
        print("\n(dry-run — no file written)")
        return
    json.dump(spec, open(SPEC, 'w'), indent=2, ensure_ascii=False)
    print("\nWrote", SPEC)


if __name__ == '__main__':
    main()
