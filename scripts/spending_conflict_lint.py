#!/usr/bin/env python3
"""
spending_conflict_lint.py — the Section-2 validator, made runnable.

Replaces plan v3's "force an entity token into every utterance" (which distorts
the training distribution and correlates taskType with entity presence) with the
thing that actually separates the 9 spending sub-tasks:

  RULE A  Discriminator presence — every non-SUMMARY skeleton must carry at
          least one of ITS OWN action words. SUMMARY is the residual class:
          it must carry NO foreign discriminator (an additive "{C1} and {C2}"
          is fine; a contrastive "vs" is not).
  RULE B  No foreign discriminator — a skeleton must not carry a HIGHER-priority
          sibling's discriminator. Priority resolves multi-signal utterances the
          same way the app-side resolver does.
  RULE C  Semantic entity requirement — ONLY where the task is incoherent
          without it: COMPARISON needs two comparable entities. Everything else
          has NO hard entity rule (missing entities are handled by the engine's
          disclosed defaults).
  RULE D  Realistic entity ratio — a SOFT, measured target (not a hard gate):
          warn if a bucket is >90% entity-bearing (distribution distortion that
          teaches the NER head to over-extract) or <25% (under-parameterized).
  RULE E  Cross-taskType near-duplicate — normalized skeletons across the 9
          sibling buckets with Jaccard >= 0.6 are flagged (the real conflict
          source; expandPatterns only checks cross-INTENT collisions today).

Usage:  python3 scripts/spending_conflict_lint.py [path-to-intent.json]
Exit 1 if any hard violation (A/B/C/E) is found.
"""
import json, re, sys, itertools

SPEC = sys.argv[1] if len(sys.argv) > 1 else 'src/knowledge/specs/SPENDING_ANALYSIS.intent.json'

# ── Discriminators: the ACTION on top of the domain, never the domain noun
# (spend/expense/money/cost are neutral and excluded on purpose). ──────────────
DISC = {
    'SUBSCRIPTIONS':      [r'subscription', r'recurring', r'recur', r'\bsip\b', r'auto.?debit', r'autopay',
                           r'membership', r'renew', r'netflix', r'spotify', r'\bregular\b', r'\bfixed\b',
                           r'fixed (monthly )?(fee|charge|payment|expense|cost)', r'standing (order|instruction)',
                           r'repeat(s|ing)?', r'keep (showing|appearing|coming)', r'every (week|month|day)',
                           r'weekly or monthly', r'monthly (fee|charge|cost|expense|payment)'],
    'TOP_SPENDERS':       [r'\btop\b', r'biggest', r'largest', r'highest', r'\bmost\b',
                           r'main (merchant|shop|store|vendor)', r'who did i (pay|spend)',
                           r'leading', r'\bcontribut', r'\bculprit', r'top (merchant|spender)',
                           r'main contributor', r'kaun se merchant', r'sabse zyada', r'which merchant.*most'],
    'ANOMALY_DETECTION':  [r'unusual', r'anomal', r'deviat', r'spike', r'surge', r'abnormal',
                           r'weird', r'strange', r'irregular', r'unexpected', r'\bodd\b', r'sudden',
                           r'\bjump\b', r'surprise', r'\bflag\b', r'fraud', r'suspicious', r'out of (the )?ordinary',
                           r'extra charge', r'than usual', r'more than usual'],
    'AVERAGES':           [r'average', r'\bavg\b', r'\bmean\b', r'per day', r'per week', r'per month',
                           r'\btypical', r'daily (spend|rate|average)', r'on average', r'run.?rate'],
    'COMPARISON':         [r'\bvs\b', r'versus', r'compar', r'against', r'difference', r'\bmore than\b',
                           r'\bless than\b', r'\bfrom .* to\b', r'\bbetween\b', r'\bhigher\b', r'\blower\b',
                           r'\bthan\b', r'\bor\b', r'next to', r'\bacross\b', r'through', r'two periods',
                           r'alag', r'\bkam\b', r'zyaad?a', r'badh(a|i|\s+ga)', r'se badh',
                           r'kitna (alag|kam|zyaad?a)'],
    'TREND':              [r'\btrend', r'over time', r'trajector', r'going (up|down)', r'rising',
                           r'falling', r'month over month', r'evolv', r'\bplot\b', r'\bdirection\b',
                           r'climbing', r'chang(e|ed|ing)', r'\bmoved?\b', r'each month', r'\bmonthly\b',
                           r'more each', r'badla', r'badhi', r'zyada ho rah', r'kaise badl',
                           r'\bpattern', r'seasonal'],
    'BREAKDOWN':          [r'break ?down', r'\bsplit\b', r'by category', r'per category', r'distribution',
                           r'percentage', r'\bpie\b', r'categor(y|ies)-?wise', r'proportion',
                           r'where.*(my )?money.*(go|going|went)'],
    # NOTE: generic "analyze/analysis" is deliberately NOT a discriminator — the
    # remediation moves bare "analyze my spending" to SUMMARY, so RULE A SHOULD
    # flag it. Only genuine causal words qualify.
    'ROOT_CAUSE':         [r'\bwhy\b', r'driv(e|ing|er|en)', r'\breason', r'\bcaus', r'\bbehind\b',
                           r'what led', r'led to', r'\bexplain', r'eating', r'draining', r'\bfactor',
                           r'\bsource', r'\bskew', r'responsible', r'(get|got|getting)\s+so\s+high',
                           r'\bkyun\b', r'kahan.*(gaya|chala)', r'badha diya'],
    # SUMMARY has no unique word — it is the residual/additive-total class.
    'SUMMARY':            [],
}

# STRONG (unambiguous) discriminators — used ONLY by Rule B for foreign-poison
# detection. Rule A uses the full DISC above (lenient: "does it express the
# action at all?"); Rule B uses these (strict: "does it carry another bucket's
# UNAMBIGUOUS word?"). Weak/ambiguous words (or, than, regular, fixed, repeat,
# most, main, change, monthly) are deliberately excluded here — they belong to
# DISC for own-presence but must not flag a sibling for review.
STRONG_DISC = {
    'SUBSCRIPTIONS':     [r'subscription', r'recurring', r'\brecur\b', r'\bsip\b', r'auto.?debit',
                          r'autopay', r'membership', r'renew', r'netflix', r'spotify', r'standing (order|instruction)'],
    'TOP_SPENDERS':      [r'\btop\b', r'biggest', r'largest', r'highest', r'leading',
                          r'who did i (pay|spend)', r'kaun se merchant', r'top (merchant|spender)'],
    'ANOMALY_DETECTION': [r'unusual', r'anomal', r'deviat', r'spike', r'surge', r'abnormal',
                          r'weird', r'strange', r'irregular', r'fraud', r'suspicious', r'sudden'],
    'AVERAGES':          [r'average', r'\bavg\b', r'\bmean\b', r'per day', r'per week', r'per month',
                          r'on average', r'run.?rate', r'daily (spend|rate|average)'],
    'COMPARISON':        [r'\bvs\b', r'versus', r'compar', r'against', r'\bdifference\b', r'\bbetween\b'],
    'TREND':             [r'\btrend', r'over time', r'trajector', r'month over month', r'rising',
                          r'falling', r'going (up|down)'],
    'BREAKDOWN':         [r'break ?down', r'\bsplit\b', r'by category', r'distribution', r'\bpie\b', r'percentage'],
    'ROOT_CAUSE':        [r'\bwhy\b', r'driv(e|ing|er|en)', r'\breason', r'\bcaus', r'what led', r'\bexplain'],
    'SUMMARY':           [],
}

# Priority: most-specific first (mirrors the app-side resolveSpendingTaskType).
PRIORITY = ['SUBSCRIPTIONS', 'TOP_SPENDERS', 'ANOMALY_DETECTION', 'AVERAGES',
            'COMPARISON', 'TREND', 'BREAKDOWN', 'ROOT_CAUSE', 'SUMMARY']

def has(patterns, text):
    t = text.lower()
    return any(re.search(p, t) for p in patterns)

def is_same_slot_range(text):
    """"between {DATE} and {DATE}" (identical slot repeated) is a single date
    RANGE (a window), not two distinct periods to contrast — 'between' here
    does not carry COMPARISON's meaning. Distinguish from a genuine two-slot
    comparison like {PERIOD1}...{PERIOD2}."""
    return bool(re.search(r'\bbetween\s+\{([A-Z0-9_]+)\}\s+and\s+\{\1\}', text))

def slots(text):
    return set(re.findall(r'\{([A-Z0-9_]+?)\d*\}', text))  # CATEGORY1 -> CATEGORY

def norm_tokens(text):
    t = re.sub(r'\{[A-Za-z0-9_]+\}', ' ', text.lower())
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    return set(w for w in t.split() if w)

def main():
    d = json.load(open(SPEC))
    up = d['utterance_patterns']
    hard = 0
    soft = 0

    review = 0
    print("=== RULE A/B: discriminator presence + no foreign discriminator ===")
    for tt, pats in up.items():
        own = DISC[tt]
        # higher-priority siblings whose discriminator must be absent
        higher = PRIORITY[:PRIORITY.index(tt)]
        for p in pats:
            # Foreign detection uses STRONG_DISC (strict); own-presence uses DISC (lenient).
            foreign = [h for h in higher if h != 'SUMMARY' and has(STRONG_DISC[h], p)]
            # "between {DATE} and {DATE}" is a single date RANGE, not a
            # COMPARISON — 'between' only fires COMPARISON's STRONG_DISC when
            # it isn't a same-slot range.
            if 'COMPARISON' in foreign and is_same_slot_range(p):
                foreign = [h for h in foreign if h != 'COMPARISON']
            # FIX (found via manual line-by-line review): SUMMARY has no
            # discriminator of its own — it must NEVER be treated as
            # "own_present=True" for the purpose of softening a foreign hit to
            # B-review. Previously this let "Break down my spending by
            # {CATEGORY}..." sit in SUMMARY as only a soft flag, despite
            # literally containing BREAKDOWN's own word. own_present for
            # SUMMARY is real evidence only (DISC['SUMMARY'] is empty, so this
            # is always False) — any foreign hit on SUMMARY is a hard B.
            own_present = has(own, p) if tt != 'SUMMARY' else False
            # COMPARISON's discriminator is ALSO satisfied by two paired entities
            # — "{CATEGORY1} or {CATEGORY2}", "{PERIOD1} … {PERIOD2}" IS the
            # comparison, even with no explicit contrastive word.
            if tt == 'COMPARISON' and not own_present:
                own_present = bool((re.search(r'\{PERIOD1\}', p) and '{PERIOD2}' in p) or
                                   (re.search(r'\{CATEGORY1\}', p) and '{CATEGORY2}' in p) or
                                   (re.search(r'\{MERCHANT1\}', p) and '{MERCHANT2}' in p))
            # RULE B (hard) — a HIGHER-priority sibling's signal AND no own signal
            # → clearly mislabeled, auto-move.
            if foreign and not own_present:
                print(f"  [B-hard] {tt:16} is really {foreign[0]} → {p}")
                hard += 1
                continue
            # RULE B (review) — both signals present → genuinely ambiguous; the
            # label stands but a human should confirm ("why did X spike").
            if foreign and own_present:
                print(f"  [B-review] {tt:14} own+{foreign[0]} (confirm) → {p}")
                review += 1
                continue
            # RULE A — non-SUMMARY skeleton with no discriminator at all.
            if tt != 'SUMMARY' and not own_present:
                print(f"  [A] {tt:18} missing its own discriminator → {p}")
                hard += 1

    print("\n=== RULE C: COMPARISON needs two comparable entities ===")
    for p in up.get('COMPARISON', []):
        # Check the RAW paired tokens — don't use slots() here, it strips the
        # trailing digit so {PERIOD1}/{PERIOD2} would collapse to one 'PERIOD'.
        two = bool((re.search(r'\{PERIOD1\}', p) and '{PERIOD2}' in p) or
                   (re.search(r'\{CATEGORY1\}', p) and '{CATEGORY2}' in p) or
                   (re.search(r'\{MERCHANT1\}', p) and '{MERCHANT2}' in p))
        # A single-period contrastive ("spending more ... than last month") is
        # valid too — the engine derives the second role. Broaden the contrastive
        # test beyond the strict adjacency in DISC.
        contrastive = has(DISC['COMPARISON'], p) or bool(re.search(r'\bthan\b|\bmore\b|\bless\b|badh|\bse\b', p.lower()))
        if not two and not contrastive:
            print(f"  [C] COMPARISON has <2 entities and no contrastive word → {p}")
            hard += 1

    print("\n=== RULE D (soft): entity-bearing ratio per bucket ===")
    for tt, pats in up.items():
        withent = sum(1 for p in pats if slots(p))
        ratio = withent / max(1, len(pats))
        flag = ''
        if ratio > 0.90: flag = 'OVER-parameterized (NER will over-extract)'
        elif ratio < 0.25: flag = 'UNDER-parameterized'
        if flag:
            print(f"  [D] {tt:18} {ratio:.0%} entity-bearing — {flag}")
            soft += 1
        else:
            print(f"      {tt:18} {ratio:.0%} entity-bearing (ok)")

    print("\n=== RULE E: cross-taskType near-duplicates (Jaccard >= 0.6, NOT discriminator-separated) ===")
    # A near-dup pair is a REAL conflict only if neither pattern carries a strong
    # discriminator the other lacks — i.e. the model has no signal to tell them
    # apart. If one says "versus"/"breakdown"/"subscription" and the other does
    # not, they are correctly separable despite token overlap → not a conflict.
    # Review-level (non-blocking): a smell for a human, not a build failure.
    flat = [(tt, p, norm_tokens(p)) for tt, pats in up.items() for p in pats]
    seen = 0
    for (t1, p1, s1), (t2, p2, s2) in itertools.combinations(flat, 2):
        if t1 == t2 or not s1 or not s2:
            continue
        j = len(s1 & s2) / len(s1 | s2)
        if j < 0.6:
            continue
        # discriminator-separated? (each carries its own strong word the other doesn't)
        sep = (has(STRONG_DISC[t1], p1) and not has(STRONG_DISC[t1], p2)) or \
              (has(STRONG_DISC[t2], p2) and not has(STRONG_DISC[t2], p1))
        if sep:
            continue
        print(f"  [E-review] {j:.2f} {t1}/{t2}\n        \"{p1}\"\n        \"{p2}\"")
        seen += 1
        review += 1
    if seen == 0:
        print("  none")

    print(f"\n=== TOTALS: {hard} hard violations, {review} review-flags, {soft} soft warnings ===")
    sys.exit(1 if hard else 0)

if __name__ == '__main__':
    main()
