# TestCasesV3.md review findings (running log)

## CRITICAL: "Xl" lakh-shorthand suffix not resolved to numeric value (NumericResolver bug)
Reproduced 3x in ADD_EXPENSE section alone:
- #228 `flipkart se 1.5l ka laptop liya` -> model spans amount="1.5l" -> mapped amount=1.5 (should be 150000)
- #238 `gold 3.5l krdo actualy` -> amount="3.5l" -> mapped amount=3.5 (should be 350000)
- #248 `goal ko 5l krdo` -> amount="5l" -> mapped amount=5 (should be 500000)
Contrast: full word "lakh" DOES resolve correctly (#355 "₹2 lakh"->200000, #356 "₹3.5 lakh"->350000).
Severity: CRITICAL if any of these ever reach a write without a human catching the 100000x-smaller amount in the confirmation card. Root cause likely NumericResolver / amount-parsing regex not recognizing the "l" suffix (only "lakh"/"L"? need to check case sensitivity - "1.5l" lowercase l didn't match, check if "L" uppercase does).

## Case 3 (SPENDING_ANALYSIS #3) `compare my this year spending with last year`
- Model extracts CATEGORY="year" from the period phrase "this year"/"last year" - bogus category.
- taskType correctly classified COMPARISON @ 0.99, but response falls back to SUMMARY narration ("[Note: Interpreted this as a summary request from the wording.]") and reports "You've spent ₹0 on this specific query" - because it filtered by the bogus category "year" which matches nothing.
- This is a real, live instance of the comparison-degenerate-fallback class of bug, triggered via a bad CATEGORY extraction rather than a bad PERIOD extraction. User asked a comparison question, got a wrong, confusing "₹0 spent" answer with no indication the comparison itself never ran.

## More "Xl"/"X.YL" lakh-shorthand amount bugs (same class as above)
- #320 `spent ₹1.2L on home renovation last week` -> amount="1.2l" -> mapped 1.2 (should be 120000). Confirms bug is case-insensitive-broken (works for neither "1.2L" nor "1.2l").

## Wrong PRIMARY category chosen from a multi-candidate categories[] list
- #314 `gave ₹120 to the local tea shop this morning` -> category="Travel", categories=["Travel","Tea & Coffee"] -- should be Tea & Coffee (a tea shop), not Travel. Likely "local" mis-triggered a transport-ish match.
- #315 `spent ₹4,250 on Myntra for clothing yesterday` -> category="Public Transport", categories=["Public Transport","Clothing"] -- should be Clothing (Myntra=fashion retailer), not Public Transport.
Pattern: when 2 categories are matched, the WRONG one is being chosen as primary in these two transport-adjacent-word false positives ("local"->Public Transport-ish, "yesterday"? no obvious trigger word for Myntra case - worth engine-side investigation of tie-break logic).

## MERCHANT names being extracted/used as CATEGORY instead of MERCHANT
- #330 `update the Amazon purchase to ₹4,999` -> category="amazon" (literal, not in taxonomy) instead of merchant="Amazon". sources shows "tfjs-category-classifier" fallback fired incorrectly.
- #333 `change the Starbucks bill to ₹350` -> category="starbucks bill" (literal raw phrase, not a taxonomy category) instead of merchant="Starbucks".

## Significant entity mis-tagging
- #323 `burnt through ₹7,800 on Zomato and Swiggy this weekend` -> model spans: targetdate="7,800" (!), date="zomato" (!). Amount entirely mistagged as TARGETDATE, merchant "zomato" mistagged as DATE. Result: mapped entities = only {date:"zomato"}, amount lost -> user asked "how much was it?" despite having clearly stated ₹7,800. High severity NER failure on a compound multi-merchant query.

## More instances, same bug classes
- #336 `actually I spent ₹1.75L on furniture not ₹2 lakh` -> amount="1.75l" -> mapped 1.75 (should be 175000). Same lakh-shorthand bug. (Positive: correctly picked the FIRST stated amount over the corrected "not X" amount.)
- #345 `forget the IRCTC travel expense` -> category="irctc" (unresolved literal) even though categories=["irctc","Travel"] has the correct "Travel" available. Same wrong-primary-from-list pattern.
- #349 `actually the Amazon gadget expense was ₹3200 not ₹2800` -> category="amazon gadget" (raw literal, unresolved taxonomy category) instead of merchant=Amazon + category=Electronics.

## Wrong merchant/category taxonomy resolution
- #340 `delete my Uber expense from yesterday` -> category="Food Delivery". WRONG - Uber is ride-hailing/cab, not food delivery. Real taxonomy mapping bug.
- #341 `remove the grocery transaction at DMart` -> merchant="Blinkit". WRONG - user said DMart explicitly; Blinkit is a different (quick-commerce) company entirely. Real merchant-resolution bug, not just "closest match" - a materially wrong identification.

## Intent misroute + entity mistagging on person-transfer phrasing
- #365 `actually make the transfer to Priya ₹1800` -> classified ADD_EXPENSE/UPDATE @ 0.75/0.71. Should very likely be FAMILY_TRANSFER (transfer TO a named person "Priya"). Also amount "1800" mistagged as TARGETDATE (same bug as #323) -> mapped entities lose the amount entirely, asks "how much was it?" despite ₹1800 being stated.

## SEVERE: ADD_LIABILITY confirmation payload discards almost all extracted detail
Reproduced across every ADD_LIABILITY CREATE/UPDATE case with real entities:
- #15 `i took a personal loan of 300000` -> model correctly extracts liabilitytype="pers0nal loan", amount=300000. Confirmation card: {"name":"New Liability","amount":300000,"category":"OTHER",...} -- liabilitytype is DROPPED, generic name/category used.
- #239 `bike loan 95000 liya hdfc se` -> extracts liabilitytype="bike loan", merchant="hdfc". Card again: {"name":"New Liability","category":"OTHER"} -- both liabilitytype AND lender dropped.
- #358 `took a home loan of ₹45 lakh from SBI at 8.4% for 20 years` -> extracts liabilitytype="home loan", amount=4500000 (correct), merchant="sbi", tenuremonths="20 years" -- ALL correctly parsed in model spans. Card: {"name":"New Liability","amount":4500000,"category":"OTHER",...} -- loan type, lender, tenure, AND interest rate (8.4%, never even in model spans as INTERESTRATE) all silently discarded. Only the amount survives.
- #359 `actually the personal loan amount is ₹4 lakh not ₹5 lakh` -> same pattern, liabilitytype dropped.
Severity: HIGH-CRITICAL. The write path for ADD_LIABILITY appears to never map liabilitytype/merchant(lender)/tenureMonths/interestRate into the ADD_COMMITMENT payload at all -- every liability gets saved as a generic, unidentifiable "New Liability"/"OTHER" regardless of what the user actually said. This defeats the feature's purpose (a user with 3 loans would have 3 indistinguishable "New Liability" entries).

## Intent misroute: "should I refinance my X loan" -> ADD_LIABILITY instead of LOAN_ANALYSIS
- #280 `should I refinance my car loan` -> classified ADD_LIABILITY/CREATE @ 0.68/0.16 (REPAIR_FIRST, very low taskType confidence). Should be LOAN_ANALYSIS/WHAT_IF ("how much do I save if I refinance"). Asked "what monthly or one-time amount should I use for this liability?" -- nonsensical response to a refinance question.
- #393 `should I refinance my personal loan` -> same misroute, same wrong clarification question.
Consistent with the LOAN_ANALYSIS audit's own finding this session that "should I refinance" framing isn't well covered/disambiguated in this intent's training data.

## Category silently changes between extraction and the actual write payload
- #352 `got 15000 from freelance work via bank transfer yesterday` -> mapped entities correctly show category="Freelance", but the LOG_TRANSACTION confirmation payload shows category="Other Income" instead. The correctly-extracted category is silently discarded before save.

## SYSTEMIC: BUDGET_PLANNING SUMMARY/STATUS ignores extracted PERIOD entirely
Cases #38,39,40,41,42,45,46,47,51,52,56,57,58,66 all return the byte-identical VERDICT/WHY/RISK/INSIGHT/IMPACT/OPTIMIZATION/NEXT ACTION block (₹97,311 spent / ₹99,800 limit / ₹7,794 overspend in EMI-Committments) regardless of stated period:
- "this quarter" (#41, #66), "this year" (#45), "last 30 days" (#46), "H1" (#56), "year to date" (#57), "march 2024" (#51), "march and june" (#52), "no period at all" (#38,40,42,47,58) -- ALL produce the exact same numbers.
- Contrast: #43 `budget overview for last month` DOES return different numbers (₹93,382/₹99,800), proving the engine has SOME period-awareness -- but it appears only "this month" vs "last month" are distinguished; every other period phrase (quarter/year/H1/date-range/specific-month) silently falls back to "this month" data without any disclosure/assumption note to the user.
Severity: HIGH. A user asking for "this year's budget summary" or "budget summary between March and June" gets a plain, undisclosed wrong-period answer with no indication the model ignored the period they explicitly stated. No [Note: ...] disclosure like AFFORDABILITY_CHECK/LOAN_ANALYSIS use for assumptions elsewhere in the codebase.

## BUDGET_PLANNING ALLOCATION taskType ignores CATEGORY entity, always returns generic 50/30/20 split
- #18 `how should I split my monthly budget` (no category) and #44 `show budgets for groceries and rent` (categories=[Groceries,Rent]) and #69 `how much budget remains for groceries` (categories=[Groceries]) all return the IDENTICAL generic VERDICT ("On your income, aim for ₹91,500 needs, ₹1,000 wants, ₹7,300 savings...") with zero mention of groceries/rent specifically.
- #69 in particular is a real defect: user asked "how much budget remains for groceries" (a STATUS/remaining-amount question), got routed to ALLOCATION taskType, and received a completely unrelated generic needs/wants/savings split that never answers the actual question (how much groceries budget is left).
Severity: HIGH for #69 specifically (non-answer to the literal question asked); MEDIUM for #44 (category entities extracted correctly but completely unused in the response).

## BUDGET_PLANNING ALLOCATION drops categories when multiple are stated
- #79 `allocate ₹80000 across rent food and savings` -> model span category="rent food" (garbled), mapped categories=["Food"] only -- "rent" and "savings" entirely dropped. Response: "Splitting ₹80,000 evenly across Food: about ₹74,160 each..." -- ignores 2 of the 3 buckets the user explicitly named, presents a single-category split as if it were the full answer.
- #81 `suggest a budget for groceries dining out and travel` -> categories=["Groceries","Travel"], "Dining Out" dropped (2 of 3 survive) -- AND the ALLOCATION engine doesn't even use the 2 that did survive, falls through to the generic default 50/30/20-vs-custom-config VERDICT identical to #18/#82 with zero mention of any category.
Severity: MEDIUM-HIGH. Multi-category allocation requests systematically lose entities and/or ignore the ones extracted, so the response never reflects what the user actually asked to split.

## CRITICAL: "family of four" parsed as an amount ("a" -> ₹1)
- #86 `budget allocation for a family of four` -> model spans amount="a" (the article "a"!), mapped amount=1. Response: "For ₹1: ₹1 needs, ₹0 wants, ₹0 savings." -- a nonsense, garbage answer to a question that isn't about a ₹1 budget at all. NumericResolver is matching stray words like "a" as numeric amounts.

## More confirmations of multi-category drop in ALLOCATION (see earlier finding)
- #95 `split ₹1.5 lakh across rent groceries travel and savings` -> categories=["Groceries"] only (rent/travel/savings all dropped), response "Splitting ₹1,50,000 evenly across Groceries..." -- 3rd confirmed instance of the same class of bug.
- #92 `how much should i budget for healthcare` -> categories=["Healthcare"] extracted correctly but the ALLOCATION engine falls to the generic default split (identical to #18/#82/#87/#90/#94/#96/#97/#99) with zero mention of healthcare -- confirms the "categories present but engine falls back to generic branch" bug is not isolated to 2-3 cases, it recurs anytime a single bare category (no amount) is given in an ALLOCATION query.

## Refinement: BUDGET_PLANNING period-blindness is a period-STRING-parsing gap, not universal
- #114 `budget planning for the next 3 months` -> DID get a distinct response ("you've spent ₹0 against a tracked limit of ₹99,800") different from the "this month" figures, proving the engine CAN compute a genuine (if here, empty-because-future) date range for some period phrases.
- This means the earlier-logged period-blindness bug (quarter/year/H1/march-2024/date-ranges all silently returning "this month" figures) is specifically a PERIOD-STRING-TO-DATE-RANGE mapping gap: only a narrow set of period phrasings ("this month" default, "last month", forward-looking "next N months") resolve to a real range; "this quarter"/"this year"/"H1"/"H2"/"march 2024"/"march and june"/"year to date"/"last 30 days"/"last quarter"/"Q2" all fall through to the current-month default without any disclosure. Still HIGH severity (wrong, undisclosed answer for a wide swath of common phrasings), just noting the more precise root cause for whoever fixes it.

## Intent misroute: money sent to a named person -> BUDGET_PLANNING instead of FAMILY_TRANSFER
- #364 `sent ₹5000 to Rahul for house rent split` -> classified BUDGET_PLANNING/ALLOCATION @ 0.75/0.73, category mis-mapped to "Home Maintenance". Should be FAMILY_TRANSFER (money sent TO a named person, "Rahul"). Same class of bug as ADD_EXPENSE #365 (`make the transfer to Priya`) logged earlier -- transfers-to-named-people are not reliably routed to FAMILY_TRANSFER across intents.

## COMPARISON-degenerate-fallback bug recurs in BUDGET_PLANNING (same class as SPENDING_ANALYSIS #3)
- #486 `I need to know if I blew past my budget on groceries compared to what I spent in April` -> taskType SUMMARY @ only 0.34 (correctly flagged REPAIR_FIRST as weak/uncertain) but engine proceeds anyway. Entities extracted CORRECTLY: period1="2026-07" (this month), period2="2026-04" (April), category=Groceries -- a real comparison is fully resolvable from the extracted entities. But the response is the exact same generic "Overall spent ₹97,311 against ₹99,800" boilerplate used for plain SUMMARY everywhere else -- ignores both the comparison intent and the category, never answers whether the user "blew past" their budget or how April compares.
Severity: HIGH -- this is a real, answerable comparison question with correctly-extracted entities that gets a non-answer.

## CASHFLOW_WARNING ignores PERIOD and MERCHANT entirely, always returns identical generic response
- #25,#384,#385,#481 all return the byte-identical VERDICT/WHY/RISK/etc block regardless of stated period ("before month end"/"month"/"last 30 days"/"this week") -- same period-blindness class of bug as BUDGET_PLANNING.
- #481 `How much did I waste on Zomato this week?` -> merchant "zomato" mistagged as DATE (same NER-mistagging bug class as ADD_EXPENSE #323/#365 logged earlier), and even if it had been tagged correctly as MERCHANT, CASHFLOW_WARNING's engine has no merchant-specific branch -- the response is the generic overall-cashflow narrative, never addresses "how much did I waste on Zomato" at all. Real non-answer to a specific, answerable question.

## CRITICAL (harness-flagged): write intents for FAMILY_TRANSFER and GOAL_PLANNING routed to READ engine, never execute
The harness itself surfaces "⛔ pipeline error: [C1 Assertion] Write intent X routed to read engine in FinanceDispatcher" for:
- FAMILY_TRANSFER: #17 CREATE (`sent 10000 to my mother`), #243 DELETE (`wo rahul wala transfer del krdo`), #366 DELETE (`remove the money I sent to Amit yesterday`)
- GOAL_PLANNING: #20 CREATE (`i want to save 10 lakhs for a house in 5 years`), #246 CREATE (`can i affrd iphone 16 pro` -- also an intent-misroute, this reads as AFFORDABILITY_CHECK not a goal-creation request), #387 CREATE (`create a goal to save ₹5 lakh for a car in 3 years`), #388 UPDATE (`increase my vacation goal to ₹2 lakh`)
Severity: CRITICAL. Every one of these is a legitimate write request (log a transfer, delete a transfer, create/update a goal) that the FinanceDispatcher's C1 assertion catches as misrouted to the read engine instead of the write engine -- meaning NONE of these actions actually execute. The user gets no confirmation card and (per the harness) an assertion failure instead of their transfer/goal being saved. This affects the entire GOAL_PLANNING CREATE/UPDATE path and the entire FAMILY_TRANSFER CREATE/DELETE path judging by this sample.

## GOAL_PLANNING: extracted entities (targetamount/goalname/tenuremonths/targetdate) never reach `mapped`
Independent of the pipeline-routing bug above:
- #20 spans={targetamount:"10 lakhs",goalname:"a house",tenuremonths:"5",targetdate:"years"} -> mapped={date:"2026-07-29"} -- literally every extracted entity dropped, only an auto-inserted today's-date survives.
- #387, #388 show the same pattern -- goalname/targetamount extracted in spans, absent from mapped.
Severity: HIGH, compounds the above -- even if the write-routing bug were fixed, the goal would still save with no name/amount/date since none of the real entities survive to the payload.

## Lakh-shorthand amount bug confirmed in GOAL_PLANNING too (3rd intent affected)
- #247 `trip ke liye 3l save krna h goal bnao` -> amount="3l" -> mapped amount=3 (should be 300000). This one actually reaches a live confirmation card: `{"type":"ADD_GOAL","payload":{"targetAmount":3,...}}` -- a real, saveable ₹3 goal instead of ₹3,00,000. Confirms the "Xl" shorthand NumericResolver bug (already found in ADD_EXPENSE) also hits GOAL_PLANNING and would silently corrupt saved data if a user didn't catch it on the confirmation screen.

## SYSTEMIC: INCOME_ANALYSIS TREND taskType renders via CASHFLOW_SUMMARY engine, never answers the income-trend question
- #9 `has my income grown over the last year` -> taskType TREND @ 1.00 (correct), but renders as `CASHFLOW_SUMMARY` -- response is the generic cashflow-warning narrative ("Your finances require immediate attention... You save 5.7%...") which never says whether income grew, shrank, or by how much. Complete non-answer.
- #186 `salary received this month` -> same CASHFLOW_SUMMARY fallback, same generic cashflow narrative, unrelated to "salary received".
- #187 `freelance income this quarter` -> category="Freelance" correctly extracted but again renders CASHFLOW_SUMMARY, completely ignoring the category and the trend request; generic response identical to #9/#186 in structure.
Severity: CRITICAL. INCOME_ANALYSIS's TREND taskType appears entirely unimplemented / mis-wired to the wrong engine -- every trend query returns the same boilerplate negative-cashflow narrative regardless of what was asked, an intent+taskType the model got RIGHT with high confidence but the backend renders wrong.

## Comparison-degenerate-fallback recurs again in INCOME_ANALYSIS (4th instance of this bug class)
- #194 `why did my salary drop compared to last month` -> period1="2026-07"/period2="2026-06" correctly extracted (a real month-over-month comparison is resolvable), taskType ANALYSIS. But VERDICT/WHY only report last month's single-source breakdown ("Salary is your main income source — 100% of the total... Sources: Salary ₹1,00,000") -- never states this month's salary, never computes or discloses a drop/comparison, never answers "why". Same class of bug as SPENDING_ANALYSIS #3, BUDGET_PLANNING #486.

## Period-blindness recurs in INCOME_ANALYSIS SUMMARY (same class as BUDGET_PLANNING/CASHFLOW_WARNING)
- #190 `rental income this quarter` -> despite periods=["this quarter"] extracted, VERDICT says "No income recorded for 1 Jul yet" (i.e. resolved to current month, not the quarter). Also category "rental" mis-mapped to "Rent" (an expense category, not an income-source category) -- likely wrong taxonomy match for an income query.

## Refinement: INCOME_ANALYSIS TREND falls to TWO DIFFERENT wrong engines, never a real trend engine
- #9,#186,#187,#196 (TREND) -> render as `CASHFLOW_SUMMARY` (generic negative-cashflow narrative).
- #203,#204,#205,#206 (TREND) -> render as `BEHAVIOR_ANALYSIS` (generic "biggest behavioral leak is EMI/Debt" narrative) -- also wrong, also never mentions income growth/decline/trend.
Neither wrong-engine group ever answers an income trend question. This confirms INCOME_ANALYSIS_TREND has no real handler wired up at all -- it silently falls through to whichever of 2 unrelated generic engines based on some other routing quirk (worth engine-side investigation into why it's non-deterministic between the two).

## INCOME_ANALYSIS COMPARISON: mostly works (verified correct % math), but 2 failure modes found
Contrast: #199 (Q1 vs Q2), #200 (H1 vs H2), #201 (Jan vs Feb), #202 (this year vs last year), #207 (March vs June) ALL correctly compute and narrate real percentage differences ("You earned 100.0% more in July than January... July: ₹99,800 · February: ₹0") -- this taskType is largely working, unlike TREND above.
But 2 exceptions produce the degenerate-comparison fallback (same bug class as SPENDING_ANALYSIS #3 etc.):
- #197 `salary vs freelance income this year` -- a category-vs-category (not period-vs-period) comparison; period1=period2="2026" (same year twice, doesn't actually vary), falls to "No income recorded for 1 Jan yet" -- the CATEGORY-comparison case isn't handled, only period-comparison is.
- #198 `this month vs last month income` -- period1="month" (raw unparsed string, not a real date) vs period2="2026-06" (real date) -- the malformed period1 apparently breaks the comparison and it silently falls back to a plain single-period SUMMARY ("You earned ₹99,800 in 1 Jul...") instead of comparing.

## Dangerous variant: malformed period-range parsing silently substitutes the WRONG comparison (not just a fallback)
- #215 `year to date income vs last year to date` -> period1="year"/period2="date" (garbled, neither a real date) -> mapped period1/period2 get reinterpreted somewhere downstream as June vs July, producing "You earned 0.2% less in July than June" -- a plausible-looking, confidently-stated, but completely WRONG answer to a "this YTD vs last YTD" question. This is more dangerous than the plain-summary fallback seen in #198/#216 because it looks like a valid, specific comparison answer while actually answering a different question the user never asked.

## CRITICAL: raw internal placeholder token leaks into user-facing narrative + self-contradicting percentages
- #377 `why is my income lower than last quarter` -> WHY states "Sources: Salary (₹2,00,000, 100%)" but INSIGHT in the SAME response states "Your largest single payer was __onboarding_import__ at ₹1,00,000 (50%)." Two separate bugs in one response:
  1. `__onboarding_import__` is a raw internal system/placeholder identifier (clearly a data-migration/seed-import marker, not a real payer name) leaked directly into user-facing text.
  2. Self-contradiction: WHY says Salary is 100% of income; INSIGHT says a different, oddly-named source is 50% -- the two statements can't both be true. Same class of bug as this session's earlier "Critical 2: narrative misattribution/self-contradiction" fix elsewhere, but recurring here in INCOME_ANALYSIS's ANALYSIS taskType.
Severity: CRITICAL -- both a real data-quality/UX bug (never expose internal identifiers to end users) and a correctness bug (contradicts itself within one response).

## IMPORTANT CAVEAT: some findings here may already be fixed in code but not yet deployed to the model this harness ran against
- #282 `what if I reduce my home loan tenure from 20 years to 15 years` -> engine falls back to "[Note: Assumed generic loan of ₹100000 at 10% for 60 months.]" -- a fabricated generic loan + fabricated 10% interest rate. This is EXACTLY the bug this session's own earlier LOAN_ANALYSIS audit already found and fixed in code ("Critical: remove fabricated 10% interestRate default", memory: loan-analysis-audit-2026-07-27.md). Its reappearance here means the TestCasesV3.md harness ran against a model/build that predates that fix (consistent with the LOAN_ANALYSIS spec/dataset fixes from this session not yet being trained+deployed).
Action item for whoever re-runs this harness after deploying the fixed model/dataset: re-verify LOAN_ANALYSIS WHAT_IF cases (#282, #293, #304, #398) specifically, since several of the fixes already implemented this session target exactly this taskType.

## LOAN_ANALYSIS: liabilitytype extracted but dropped from mapped -- causes a real "loan not found" false negative
- #281 `compare my personal loan and home loan interest rates` -> spans liabilitytype="pers0nal loan" (typo'd but fuzzy-matchable), mapped={} (dropped) -> "I couldn't find a loan matching that." But the fixture's actual loan list (visible in #293/#398: "ICICI Personal Loan, HDFC Loan, Macbook Pro EMI, Apple Care EMI") DOES include a personal loan. This is a genuine false negative: a loan that exists gets reported as not found because the extracted liabilitytype entity is dropped before the matching step runs.
- (#279/#392 asking about "home loan" correctly return "not found" since the fixture genuinely has no home loan -- not a bug, confirmed by the loan list above.)

## Intent misroute: budget-status question misrouted to NAVIGATE/paywall
- #75 `is my subscriptions budget exhausted` -> classified NAVIGATE (not BUDGET_PLANNING/STATUS), mapped merchant="paywall" (fabricated, never in the query), route: navigate -> "Would navigate to: paywall". A clear budget-status question about a real category (Subscriptions, correctly extracted) never gets answered at all -- the user is redirected to a paywall screen instead. Likely "subscriptions" is triggering a premium-feature/paywall heuristic. Real, severe misroute -- the user asked a normal free-tier question and would be shown an upsell/paywall screen instead of an answer.

## Comparison-degenerate-fallback recurs again in SAVINGS_ADVICE (6th instance of this bug class)
- #464 `Did I save more money this month compared to the previous one?` -> period1="2026-07"/period2="previous" (malformed), taskType SUMMARY @ only 0.07 (correctly flagged as very weak/REPAIR_FIRST) but engine proceeds anyway to the generic BEHAVIOR_ANALYSIS narrative ("You are falling short of your savings target... biggest behavioral leak is EMI") -- never answers "did I save more" or compares the two months at all.

## CRITICAL: SIP_VS_PREPAY says "no active EMI burden" but the SAME test user has a ₹56,524 EMI per LOAN_ANALYSIS/BUDGET_PLANNING
All 6 SIP_VS_PREPAY cases (#28,#236,#289,#400,#401,#402) return the identical VERDICT "Investing in SIPs is the clear choice" with WHY "With no active EMI burden, your surplus is entirely free."
But for the SAME fixture user, elsewhere in this same test run:
- LOAN_ANALYSIS #277 `what's my total outstanding loan amount right now` -> "ICICI Personal Loan: ₹56,524 in EMI, ₹0 outstanding."
- BUDGET_PLANNING (many cases, e.g. #18/#38) -> "₹56,524 of your needs is already committed to fixed payments" / "reduce your spending in EMI / Committments by ₹7,794"
So the user demonstrably HAS an active ₹56,524/month EMI commitment, yet SIP_VS_PREPAY confidently states there is none. Likely root cause: this session's own earlier fix "SIP_VS_PREPAY: exclude rate-less loans from weightedLoanRate" (see memory training-cycle-2026-07-23.md) excludes the ICICI Personal Loan (probably rate-less in this fixture) from the weighted-rate calc -- but that exclusion appears to have also caused the engine to treat the EMI as entirely absent from the "do you have an EMI burden" check, not just from the rate-averaging math. Excluding a rate-less loan from a RATE calculation is correct; concluding "no EMI burden exists" because of it is a separate, incorrect inference.
Severity: CRITICAL -- this is a materially wrong, confidently-stated financial answer that contradicts the app's own other-engine data for the same user, and could lead someone to under-prioritize an existing EMI obligation in a prepay-vs-invest decision.

## Period-blindness recurs in SPENDING_ANALYSIS: specific/named months collapse to "last month"
- #7 `how much did I spend at Swiggy in June` -> merchant correctly resolved (Swiggy), but "total spending of ₹94,093" is byte-identical to #1/#6's "last month" total -- "June" (a specifically named different month) silently resolves to the same figures as the generic "last month" default, not an actual June-specific total. Same period-string-to-date-range mapping gap already logged for BUDGET_PLANNING/CASHFLOW_WARNING/INCOME_ANALYSIS, now confirmed in SPENDING_ANALYSIS too (5th intent affected by this bug class).

## SEVERE: category-vs-category COMPARISON produces a garbled, self-contradictory narrative with wrong math
- #154 `food vs travel spending this month` -> only "Travel" survives as the extracted category (Food dropped from entities), yet the narrative text references BOTH: VERDICT = "Compared to Food, your Food, Travel spending in Travel is down by ₹0." (grammatically broken, "Food, Travel" listed as one garbled label) and WHY = "In Food you spent ₹6,739, and in Travel you spent ₹6,739 (0.0% decrease)" -- IDENTICAL amounts for both categories, strongly suggesting the engine is actually comparing "Travel vs Travel" (the only category it kept) while mislabeling one side "Food" in the text. A user asking to compare two real, different categories gets a nonsensical, self-contradictory answer claiming they're numerically identical.
Severity: HIGH -- both a template/narrative-generation bug (garbled text) and a likely math bug (same category compared against itself).

## SPENDING_ANALYSIS TREND misroutes to BEHAVIOR_ANALYSIS specifically when a CATEGORY is present
- #4 `is my spending going up over the last 6 months` (no category) and #159 `is my spending increasing over the last 6 months` (no category) -> correctly render via `ANALYZE_SPENDING` with a real trend narrative ("trending up — 100% higher than February...").
- #160 `travel expense trend from Jan to April` (category=Travel) and #161 `rent spending trend year to date` (category=Rent) -> both misroute to `BEHAVIOR_ANALYSIS`, returning the same generic "biggest behavioral leak is Debt" narrative from SAVINGS_ADVICE/INCOME_ANALYSIS TREND, completely ignoring the requested category and never mentioning a trend.
Pattern: SPENDING_ANALYSIS_TREND routing to the wrong engine appears specifically when a CATEGORY entity is present alongside TREND -- a narrower, more specific bug than a blanket "TREND always broken" (contrast with INCOME_ANALYSIS where TREND is broken even without a category).

## Minor: truncated/garbled merchant name "SE" surfaces in user-facing text
- #151 `why are my dining out expenses so high recently` -> INSIGHT says "Largest destination: SE (₹140)" -- "SE" reads like a truncated or mis-parsed merchant/place name, not a real destination. Worth a data-quality check on wherever "largest destination" merchant names are sourced/truncated for ROOT_CAUSE.

## Confirmed again: Uber/Ola mis-taxonomized as "Food Delivery" (recurs in SPENDING_ANALYSIS)
- #170 `last week how much on Uber and Ola` -> category mapped to "Food Delivery" (wrong -- Uber/Ola are ride-hailing), "Ola" dropped entirely from entities. Same taxonomy bug as ADD_EXPENSE #340 (`delete my Uber expense` -> "Food Delivery"), now confirmed in a 2nd intent, reinforcing this is a systemic merchant-to-category taxonomy defect, not a one-off.

## More NER merchant+date-merge false negatives (same class as #323/#365 from ADD_EXPENSE)
- #416 `Tell me how much I spent on Uber yesterday.` -> model span merges into a single garbled date="uber yesterday" -- merchant "Uber" never separately extracted, no merchant field at all. Result: "You haven't logged any expenses yet" -- a false negative caused entirely by the merchant/date NER merge, not by genuinely having no matching data.
- #370 `food vs travel spending last month` -> same garbled "Food, Travel" dual-category label bug as #154, confirming it's a reusable narrative template bug (2nd occurrence): "Compared to July, your Food, Travel spending in June is down by ₹2,106" -- still lists both categories jammed into one label even though only "Travel" survived as the actual filtered category (per categories:["Travel"]).

## Category NER swallows adjacent unrelated word ("electricity last" instead of "Electricity Bill")
- #436 `Total spend on electricity last year?` -> category mapped as literal unresolved "electricity last" (the word "last" from "last year" gets swallowed into the category span) instead of resolving to the "Electricity Bill" taxonomy category. Same raw-literal-category-not-resolved bug class as ADD_EXPENSE's "amazon gadget"/"irctc" findings, here caused by a word-boundary NER error pulling in an adjacent unrelated token.

## Confirms: category-vs-category COMPARISON narrative template is broken (root cause identified precisely)
- #461 `Am I spending more on dining out than groceries this month?` -> categories=["Dining Out","Groceries"] both correctly kept this time, and the underlying numbers ARE two genuinely different categories (Dining Out ₹140 vs Groceries ₹2,123, a real 1416.5% difference) -- but the narrative template, clearly built for PERIOD-vs-period phrasing ("Compared to X, your spending in Y is up/down by Z"), gets reused verbatim for CATEGORY-vs-category comparisons and produces nonsense: "Compared to Dining Out, your Dining Out vs Groceries spending in Groceries is up by ₹1,983" and "Your highest spending category in Groceries was Groceries, compared to Dining Out in Dining Out."
Confirms (together with #154/#370) that the category-vs-category COMPARISON path has a dedicated, reusable narrative-template bug distinct from the entity-extraction/math layer -- worth a direct code fix to add a category-comparison-specific template rather than reusing the period-comparison one.

## MOST SEVERE FINDING: 34 of 40 UNKNOWN-bucket cases are legitimate, answerable financial queries getting ZERO intent signal (0.00/0.00 confidence)
Read all 40 UNKNOWN cases (lines 12607-13171). Every one returns intent @0.00, taskType @0.00, empty model spans, and the generic "I couldn't quite understand that" fallback -- meaning the on-device model produces literally no usable signal for these inputs (not low-confidence-but-present, actually zero).
Only ~6 of the 40 are legitimately out-of-scope/ambiguous and correctly belong in UNKNOWN: #33 "what is the weather tomorrow", #250 "hello bhai kya hal", #251 "reliance share kharidu kya abhi" (stock-buying advice, rightly out of scope), #403 "hello", #404 "tell me a joke", #406 "what's the weather in Bangalore today".
The other ~34 are clear, answerable financial queries with an obvious intended intent that get zero signal:
- ADD_INCOME/INCOME_DECLARATION phrasing: #13 "received 5000 freelance payment today" (harness itself flags intended ADD_INCOME), #225 "mera salry 85000 ayi aaj", #351 "salary of ₹85000 credited today"
- ADD_EXPENSE phrasing: #317 "paid ₹18,500 school fees this month", #325 "paid ₹3 lakh as house rent today", #227 "wo uber ka expnse hata do" (delete that Uber expense)
- BUDGET_PLANNING phrasing: #91 "create a monthly spending allocation of ₹45000", #93 "plan a ₹70000 monthly budget"
- INCOME_ANALYSIS phrasing: #208 "salary and bonus received this quarter", #212 "income by category for last month", #219 "cashback rewards trend recently"
- DEBT_FREEDOM_ANALYSIS/LOAN_ANALYSIS phrasing: #27 "when will I be debt free" (harness flags intended DEBT_FREEDOM_ANALYSIS), #234/#305 "emi kab tk chalegi" variants, #285 "which loan has the highest interest rate", #286 "if I switch to a lower interest rate how much will I save", #294 "is it risky to keep paying only the minimum EMI", #297 "if I get a ₹1 lakh bonus where should I put it to become debt free sooner", #298 "can I be debt free before 2030", #306 "extra payment karu ya current EMI continue karu...", #397 "best strategy to become debt free faster"
- SPENDING_ANALYSIS/NET_WORTH_CHECK/CASHFLOW phrasing: #32 "how much", #36 "compare" (both very short/ambiguous, borderline defensible), #233 "kitna bcha mere pass abhi", #245 "mera networth kitna h", #255 "groceries between January and February", #369 "this month where did all my money go", #382 "kitna bacha is month", #417 "Show me the category breakdown for this year.", #424 "How much did I blow on coffee this month?", #426 "Where did my money go last year?", #462 "What's the difference in my utility bills between Q1 and Q2?", #484 "Can you check if my weekend partying is eating up my whole paycheck?"
- #241 "refund ko 1399 krdo" (REFUND UPDATE)

Pattern: two dense clusters explain most of this --
1. Hindi/Hinglish phrasing is dramatically under-covered: #225, #227, #233, #234, #241, #251, #305, #306, #382 are ALL Hindi/Hinglish and ALL got 0.00/0.00. English equivalents of nearly all these queries (e.g. "when will I be debt free", "how much have I saved this month") work fine elsewhere in the suite -- strongly suggests the Hinglish training-data coverage is far thinner than English across every intent, not just one.
2. Natural, conversational phrasing without a clean keyword anchor also fails broadly in English: casual/indirect phrasings like "Can you check if my weekend partying is eating up my whole paycheck?", "this month where did all my money go", "best strategy to become debt free faster" get zero signal even though the intent is unambiguous to a human reader.
Severity: CRITICAL and the single largest-blast-radius finding in this review -- roughly 7% of the entire 486-case suite (34 cases) are real, in-scope user questions that produce a dead end (a generic "I couldn't understand" message) rather than any attempt at an answer, disproportionately affecting Hindi/Hinglish speakers.
