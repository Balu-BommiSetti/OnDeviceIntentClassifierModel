# SPENDING_ANALYSIS — Conflict Validator Spec (Section 2, corrected)

**Replaces plan v3's "entity-forced generation."** That approach forced an entity
token (`{PERIOD}` / `{CATEGORY}` / `{MERCHANT}`) into every utterance so the NER head
would "aggressively extract." That is the wrong lever:

- The engine already handles missing entities with disclosed defaults, so the premise
  ("queries fail without entities") is false.
- Forcing entities trains the model on a distribution production doesn't have (real
  users say "show my subscriptions" with no entity) → entity-less queries become
  out-of-distribution at inference.
- It manufactures a spurious *taskType ↔ entity* correlation. The discriminator must be
  the **action word** (subscription / average / breakdown / why / top / unusual), never
  the presence of an entity.

What actually separates the 9 sub-tasks is the **action word**. This spec operationalizes
that as five rules, implemented as a runnable linter (`scripts/spending_conflict_lint.py`)
that becomes a `validate.ts` gate.

---

## The five rules

| Rule | Severity | What it checks |
|---|---|---|
| **A — discriminator presence** | hard | Every non-SUMMARY skeleton carries ≥1 of its OWN action words. SUMMARY is the residual/additive-total class (no unique word required). |
| **B — no foreign discriminator** | hard *or* review | A skeleton carrying a HIGHER-priority sibling's action word. **B-hard** = foreign present AND own absent (clearly mislabeled → auto-move). **B-review** = both present (ambiguous, e.g. "why did X *spike*" → human confirms the label). |
| **C — semantic entity requirement** | hard | ONLY where the task is incoherent otherwise: COMPARISON needs two comparable entities (`{PERIOD1}+{PERIOD2}`, `{CATEGORY1}+{CATEGORY2}`, `{MERCHANT1}+{MERCHANT2}`) OR a contrastive word. No other taskType has a hard entity rule. |
| **D — realistic entity ratio** | soft | Warn if a bucket is >90% entity-bearing (NER over-extraction risk) or <25% (under-parameterized). A measured target, NOT a hard gate — the opposite of forcing 100%. |
| **E — cross-taskType near-duplicate** | hard | Normalized skeletons across the 9 sibling buckets with Jaccard ≥ 0.6. This is the real conflict source; `expandPatterns.ts` only checks cross-INTENT collisions today. |

### Priority order (resolves multi-signal utterances)
`SUBSCRIPTIONS > TOP_SPENDERS > ANOMALY_DETECTION > AVERAGES > COMPARISON > TREND > BREAKDOWN > ROOT_CAUSE > SUMMARY`

Mirrors the app-side `resolveSpendingTaskType` so training labels and runtime resolution
agree. SUMMARY is last (the residual class).

### Discriminator table (the artifact to curate)
The action words per taskType live in `DISC` in the linter. Domain nouns
(spend / expense / money / cost) are deliberately **excluded** — they are neutral and
appear in every bucket. Generic "analyze / analysis" is **excluded from ROOT_CAUSE** on
purpose: bare "analyze my spending" should fall to SUMMARY (per the remediation map), so
Rule A correctly flags it. Only genuine causal words (why / cause / driver / factor /
source / reason / behind) qualify for ROOT_CAUSE.

---

## Results on the CURRENT spec (run today)

```
72  [A]        missing own discriminator
11  [B-hard]   clear mislabel → auto-move
56  [B-review] both signals → human confirm
 4  [C]        COMPARISON missing 2nd entity (all Hindi contrastive forms)
 6  [D]        entity-ratio warnings
23  [E]        cross-taskType near-duplicates (Jaccard ≥ 0.6)
= 110 hard, 56 review, 6 soft
```

**Every B-hard is a real mislabel** and matches the remediation map, e.g.:
- `where is my money going` (ROOT_CAUSE) → BREAKDOWN
- `reveal the top merchants that spike my spend` (ROOT_CAUSE) → TOP_SPENDERS
- `check if I should cancel a subscription at {MERCHANT}` (TOP_SPENDERS) → SUBSCRIPTIONS
- `give me a rundown of my biggest {CATEGORY} expenses` (ANOMALY) → TOP_SPENDERS

**Two genuine findings the linter surfaced (not false positives):**
1. **Discriminator lists need multilingual coverage.** The 4 remaining Rule C flags are
   all Hindi contrastive forms (`kitna alag hai`, `zyaada hua`, `se badha`). English-only
   word lists silently mishandle the Hinglish probes. The tables must carry Hindi action
   words (`alag`, `kam`, `zyada`, `badha`, `kyun`, `kaise badla`).
2. **The lists themselves are the curation target.** A few Rule A flags are list gaps
   (e.g. TREND "changed over", "moved") vs genuine ("analyze my spending" → SUMMARY). The
   linter makes the lists auditable instead of implicit.

---

## Integration (how this becomes a gate)

1. **`validate.ts` — new gate (9):** run rules A/B-hard/C/E over `SPENDING_ANALYSIS`
   (generalizes to any intent with a large taskType fan-out). Hard violations fail the
   build, exactly like the existing skeleton-diversity gate (8).
2. **`expandPatterns.ts` — generation-time:** when generating a bucket, inject the
   bucket's **discriminator** (must include ≥1) and its **forbidden set** (higher-priority
   siblings' words) into the LLM prompt — instead of the plan's "force an entity" rule.
   Re-run the linter on candidates before they reach the review file.
3. **B-review + D** are reported, not build-failing — they go to the human reviewer.

## Prompt strategy (corrected)
```
You are expanding the {taskType} bucket for SPENDING_ANALYSIS.
RULES:
1. Every skeleton MUST convey the {taskType} action using one of: {discriminators}.
2. Do NOT use any of these words (they belong to other sub-tasks): {forbidden}.
3. Vary entity presence REALISTICALLY: ~60–70% of skeletons include {CATEGORY}/{PERIOD}/
   {MERCHANT} placeholders, ~30–40% are bare (no placeholder). Do not force an entity
   into every line.
4. Use diverse grammar (questions, commands, casual) and include Hinglish variants.
```

## What this deliberately does NOT do
- Does not force entities (Rule D keeps the distribution realistic instead).
- Does not delete real coverage (pairs with the move-not-delete remediation map).
- Does not auto-resolve B-review ambiguities — a keyword linter shouldn't pretend to.

## Next steps after approval
1. Curate the discriminator/forbidden tables (add multilingual terms) — the one manual
   input this needs.
2. Wire rules A/B-hard/C/E into `validate.ts` as gate (9); wire the prompt strategy into
   `expandPatterns.ts`.
3. Apply the remediation map → re-run the linter → expect hard=0, small B-review set.
4. Rebalance-generate to level buckets (~80–100), re-lint, then train deterministically
   and gate (before-probe → train once same seed → probe/regression/QA + guard neighbors).
