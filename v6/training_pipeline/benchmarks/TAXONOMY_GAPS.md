# Taxonomy gaps — realistic queries the taxonomy cannot express

These 22 cases were written as regression tests against realistic user
phrasing, then moved OUT of regression_suite.jsonl because each asserts an
`intent|taskType` bucket that **no spec declares in `supported_actions` and
that has zero training rows**. The model cannot pass them; leaving them in the
suite depressed the pass rate to 35/61 (57%) and buried the 39 cases that
actually measure model quality (35/39 = 90%).

They are kept because they are NOT noise — they are a prioritised backlog.
Each line is a query a user will plausibly type that currently has nowhere
correct to land.

## The pattern

The per-intent taskType audit was completed for 2 of 18 intents
(SPENDING_ANALYSIS, DEBT_FREEDOM_ANALYSIS) — those carry 5 taskTypes each.
Every un-audited intent kept whatever it started with, and several collapsed to
a single SUMMARY bucket.

The sharpest example is **SIP_VS_PREPAY, which supports only SUMMARY.**
Comparing SIP investment against loan prepayment is inherently a COMPARISON,
and "what if I prepay 5L instead" is inherently a WHAT_IF — the intent's two
most natural phrasings both collapse into SUMMARY. Same shape for
NET_WORTH_CHECK (SUMMARY only; no COMPARISON for "how has my net worth changed
since last year") and SAVINGS_ADVICE (SUMMARY only).

## Before acting on these

For each gap, decide deliberately — do not just add buckets to make tests pass:
  1. Is the bucket real product behaviour, or is the test case wrong?
  2. If real: does an ENGINE exist to serve it? A taskType with no engine
     produces a confident answer backed by nothing.
  3. Only then add it to the spec's supported_actions and generate patterns.

Gap buckets, by intent:
  - `ADD_ASSET|SUMMARY`
  - `ADD_EXPENSE|ANALYSIS`
  - `ADD_EXPENSE|SUMMARY`
  - `ADD_INCOME|ANALYSIS`
  - `ADD_INCOME|SUMMARY`
  - `ADD_LIABILITY|SUMMARY`
  - `BUDGET_PLANNING|ANALYSIS`
  - `BUDGET_PLANNING|INSIGHTS`
  - `CASHFLOW_WARNING|ANALYSIS`
  - `CASHFLOW_WARNING|INSIGHTS`
  - `DEBT_FREEDOM_ANALYSIS|ANALYSIS`
  - `FAMILY_TRANSFER|SUMMARY`
  - `GOAL_PLANNING|SUMMARY`
  - `INCOME_DECLARATION|SUMMARY`
  - `NET_WORTH_CHECK|ANALYSIS`
  - `NET_WORTH_CHECK|COMPARISON`
  - `REFUND|SUMMARY`
  - `SAVINGS_ADVICE|ANALYSIS`
  - `SAVINGS_ADVICE|INSIGHTS`
  - `SIP_VS_PREPAY|ANALYSIS`
  - `SIP_VS_PREPAY|COMPARISON`
  - `SIP_VS_PREPAY|WHAT_IF`
