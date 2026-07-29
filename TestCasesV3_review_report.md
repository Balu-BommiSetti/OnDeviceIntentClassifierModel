# TestCasesV3.md Exhaustive Review — Consolidated Findings

Reviewed all 486 test cases (every query and every line of every response) across all 23 intent sections. Cross-checked intent prediction, taskType prediction, entity extraction, downstream calculations, and whether the final response actually answers what the user asked.

**Important caveat on provenance:** this harness ran against the *currently deployed* on-device model. At least one finding (#282, LOAN_ANALYSIS fabricated 10% interest rate) is a bug this session's own earlier LOAN_ANALYSIS audit already fixed in code but has not yet been trained/deployed. Treat any finding touching AFFORDABILITY_CHECK, DEBT_FREEDOM_ANALYSIS, LOAN_ANALYSIS, or SIP_VS_PREPAY as "confirm against current code before re-fixing" — it may already be resolved and just not deployed yet.

---

## Findings ranked by severity

### CRITICAL

1. **34 of 40 UNKNOWN-bucket cases (≈7% of the whole suite) are legitimate financial queries getting 0.00/0.00 confidence — zero model signal, not just low confidence.** Two clusters: (a) Hindi/Hinglish phrasing is dramatically under-covered — every Hinglish query in the UNKNOWN bucket (`mera salry 85000 ayi aaj`, `emi kab tk chalegi`, `kitna bcha mere pass abhi`, etc.) got zero signal even though English equivalents work fine elsewhere; (b) natural/conversational English phrasing without a keyword anchor also fails (`Can you check if my weekend partying is eating up my whole paycheck?`, `best strategy to become debt free faster`). This is the single largest-blast-radius defect found.

2. **Write intents for FAMILY_TRANSFER (CREATE/DELETE) and GOAL_PLANNING (CREATE/UPDATE) are misrouted to the read engine and never execute** — the harness's own `⛔ [C1 Assertion]` errors confirm this. A user creating a goal or logging a transfer to a family member gets no confirmation card at all; the write silently fails.

3. **ADD_LIABILITY confirmation payloads discard nearly all extracted detail.** Every liability (personal loan, bike loan, home loan) saves as generic `"name":"New Liability","category":"OTHER"` — lender, loan type, tenure, and interest rate are all extracted correctly but never reach the write payload. Defeats the purpose of detailed loan logging.

4. **"Xl"/"X.YL" lakh-shorthand amounts resolve 100,000x too small**, confirmed across ADD_EXPENSE, GOAL_PLANNING, and via the same NumericResolver in at least 6 distinct cases (`1.5l`→1.5 instead of 150000, `3l`→3 instead of 300000, etc.). Full-word "lakh" parses correctly; only the shorthand suffix is broken, case-insensitively. One instance (`#247`) reaches a live, savable confirmation card.

5. **GOAL_PLANNING entities (targetAmount/goalName/tenure/targetDate) never reach `mapped`** — independent of the routing bug above, so even a fixed router would still save a nameless, amountless goal.

6. **SIP_VS_PREPAY confidently states "no active EMI burden" for a user who demonstrably has a ₹56,524/month EMI** (per LOAN_ANALYSIS and BUDGET_PLANNING responses for the same fixture). Likely caused by this session's own earlier fix that excludes rate-less loans from the weighted-rate calc — that exclusion appears to have also suppressed the loan from the "do you have an EMI" check entirely, not just the rate averaging. Worth revisiting `SIP_VS_PREPAY: exclude rate-less loans from weightedLoanRate`.

7. **Raw internal placeholder token `__onboarding_import__` leaks into user-facing text**, alongside a self-contradiction within the same response (WHY says Salary is 100% of income; INSIGHT says a different source is 50%). INCOME_ANALYSIS ANALYSIS taskType, case #377.

8. **"family of four" parses the article "a" as an amount**, producing a nonsense "For ₹1: ₹1 needs, ₹0 wants" response to a budgeting question that has nothing to do with ₹1 (BUDGET_PLANNING #86).

### HIGH

9. **Period-string-to-date-range mapping is broken for most phrasings beyond "this month"/"last month"** — confirmed across 5 intents (BUDGET_PLANNING, CASHFLOW_WARNING, INCOME_ANALYSIS, SPENDING_ANALYSIS, and implicitly others). "this quarter", "H1/H2", "year to date", "Q2", named months like "June", and explicit date ranges all silently fall back to "this month" data with **no disclosure** that the requested period was ignored — unlike other parts of the codebase (AFFORDABILITY_CHECK, LOAN_ANALYSIS) which do disclose assumptions via `[Note: ...]`.

10. **"Comparison-degenerate-fallback" bug recurs at least 6 times across 4 intents** (SPENDING_ANALYSIS, BUDGET_PLANNING, INCOME_ANALYSIS, SAVINGS_ADVICE): a genuine comparison question, with correctly-extracted period1/period2 or category, silently falls back to a single-period SUMMARY narrative and never actually compares anything — with no indication to the user that the comparison never ran.

11. **A more dangerous variant**: malformed period-range parsing occasionally substitutes a *different, wrong* comparison instead of falling back safely — e.g. "year to date vs last year to date" (#215) confidently answers with a June-vs-July comparison nobody asked for.

12. **Category-vs-category COMPARISON has a broken, reused narrative template** (built for period-vs-period phrasing), producing garbled text like *"Compared to Food, your Food, Travel spending in Travel is down by ₹0"* and, worse, sometimes appears to compare a category against itself (identical ₹ amounts on both sides). Confirmed 3x (#154, #370, #461).

13. **Merchant/date NER frequently merges or mistags fields on compound queries**: amounts tagged as TARGETDATE, merchants (Zomato, Uber) tagged as DATE, "Uber yesterday" merged into one garbled date string with the merchant lost entirely. Consistently causes false "you haven't spent anything" answers despite a clearly stated amount/merchant.

14. **Merchant/category taxonomy resolution is wrong in several concrete cases**: Uber/Ola → "Food Delivery" (should be ride-hailing/Transport, confirmed 2x across intents), DMart → resolved to "Blinkit" (a different company), literal unresolved category strings surface instead of the correct taxonomy match ("amazon gadget", "irctc", "amazon", "starbucks bill", "electricity last").

15. **Intent misroutes on "transfer to a named person" phrasing** — routes to ADD_EXPENSE or BUDGET_PLANNING instead of FAMILY_TRANSFER, confirmed 2x (`make the transfer to Priya`, `sent ₹5000 to Rahul for house rent split`).

16. **"Should I refinance my X loan" misroutes to ADD_LIABILITY** instead of LOAN_ANALYSIS, producing a nonsensical "what amount should I use for this liability?" clarification for what is clearly a WHAT_IF analysis question. 2x confirmed.

17. **BUDGET_PLANNING ALLOCATION ignores CATEGORY entirely** in its default branch, returning the same generic 50/30/20-style split regardless of which category(ies) were named — confirmed across 8+ cases. When multiple categories are stated, most are silently dropped before the response is generated (only 1 of 2–4 named categories survives).

18. **BUDGET_PLANNING category silently changes between extraction and the write payload** — `category="Freelance"` is correctly extracted for a refund/income log, but the actual save payload uses `"Other Income"` instead.

19. **INCOME_ANALYSIS TREND taskType has no real handler** — falls through non-deterministically to either CASHFLOW_SUMMARY or BEHAVIOR_ANALYSIS, neither of which ever answers an income-trend question, despite the model correctly identifying TREND with high confidence.

20. **SPENDING_ANALYSIS TREND misroutes to BEHAVIOR_ANALYSIS specifically when a CATEGORY entity is present** (works fine with no category) — a narrower version of the same class of bug as #19.

21. **NAVIGATE/paywall intent misroute**: "is my subscriptions budget exhausted" (a normal free-tier budget-status question) gets routed to a fabricated "paywall" navigation target instead of being answered.

22. **CASHFLOW_WARNING ignores both PERIOD and MERCHANT** — all 4 test cases return byte-identical generic output regardless of what was asked.

23. **LOAN_ANALYSIS drops the `liabilitytype` entity before matching**, causing a real false negative — "compare my personal loan and home loan" reports "couldn't find a loan matching that" even though the user's fixture genuinely has a personal loan.

### MEDIUM / LOW

24. Wrong primary category chosen when 2+ categories match (tea shop → "Travel" instead of "Tea & Coffee"; Myntra → "Public Transport" instead of "Clothing").
25. Truncated/garbled merchant name "SE" surfaces in a ROOT_CAUSE insight — likely a data-source truncation bug worth a quick look.
26. Minor UI-text polish: literal "None" shown as a category name instead of "no spending recorded" in some comparison responses when one side has zero data.
27. ROOT_CAUSE taskType frequently returns generic, non-specific boilerplate ("Here's what's behind your spending... No single merchant dominates") rather than a real driver analysis — possibly a fixture-data limitation rather than a bug; lower confidence, worth spot-checking with richer transaction data.

---

## What's working well (positive controls, for calibration)
- ADD_EXPENSE/ADD_LIABILITY/ADD_INCOME clarification and confirmation-card flows are correct in the large majority of cases.
- INCOME_ANALYSIS COMPARISON is largely correct (verified real % math across 5+ cases) except for the 2 failure modes noted above.
- SPENDING_ANALYSIS COMPARISON, TREND, BREAKDOWN, and TOP_SPENDERS are correct when period/category resolve to real values (e.g. #180, #253, #420, #174).
- The harness's own self-flagged warnings (intent-misroute flags, pipeline-error assertions, low-confidence markers) are reliable and matched independent findings throughout.

## Full findings log
The complete, unabridged running log with every case reference is saved at:
`scratchpad/harness_findings.md` (211 lines, chronological by section).
