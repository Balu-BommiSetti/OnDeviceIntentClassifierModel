# WealthPilot Intent & Entity Cheat Sheet

## Intent: `ADD_INCOME`
**Description**: User records money received — salary, freelance, bonus, interest, cashback, etc.

### TaskType: `LOG`
- **Label**: Log new income entry
- **Valid Slots (Entities)**: `{amount}`, `{source}`, `{date}`
- **Examples**: 
  - "Salary credited ₹75000 today"
  - "Received freelance payment of 15k from client"

### TaskType: `RECURRING`
- **Label**: Mark income as recurring
- **Valid Slots (Entities)**: `{amount}`, `{source}`, `{frequency}`
- **Examples**: 
  - "My monthly salary is 1.2 lakhs"
  - "I get paid $5000 every two weeks"

## Intent: `ADD_EXPENSE`
**Description**: User records an outgoing payment with category, merchant, method, and date.

### TaskType: `LOG`
- **Label**: Record a single expense
- **Valid Slots (Entities)**: `{amount}`, `{category}`, `{merchant}`, `{date}`
- **Examples**: 
  - "Spent 500 on groceries today"
  - "Paid electricity bill 1200"

### TaskType: `SPLIT`
- **Label**: Shared / split expense
- **Valid Slots (Entities)**: `{amount}`, `{category}`, `{merchant}`, `{splitWith}`
- **Examples**: 
  - "Split dinner bill 2400 with Rahul and Priya"
  - "Divided rent ₹30000 between 3 of us"

### TaskType: `REIMBURSABLE`
- **Label**: Expense to be reimbursed
- **Valid Slots (Entities)**: `{amount}`, `{category}`, `{merchant}`, `{notes}`
- **Examples**: 
  - "Paid 3000 for office supplies, will claim back from company"
  - "Bought stationery $150 for work — reimbursable"

## Intent: `INCOME_DECLARATION`
**Description**: User states their income profile for financial modelling — not a transaction record.

### TaskType: `MONTHLY_SALARY`
- **Label**: Monthly salary declaration
- **Valid Slots (Entities)**: `{amount}`, `{frequency}`
- **Examples**: 
  - "My monthly salary is 1.2 lakhs"
  - "I make $7500 per month"

### TaskType: `ANNUAL`
- **Label**: Annual / CTC income declaration
- **Valid Slots (Entities)**: `{amount}`, `{frequency}`
- **Examples**: 
  - "My CTC is 24 LPA"
  - "I earn 18 lakhs a year"

### TaskType: `VARIABLE`
- **Label**: Variable / freelance income
- **Valid Slots (Entities)**: `{amount}`
- **Examples**: 
  - "My income varies between 50k and 80k a month"
  - "I earn roughly $3000–$6000 from freelance"

### TaskType: `MULTIPLE_SOURCES`
- **Label**: Multiple income sources
- **Valid Slots (Entities)**: `{amount}`, `{source}`, `{secondaryAmount}`, `{secondarySource}`
- **Examples**: 
  - "Salary is 90k plus 20k from freelance per month"
  - "I make $5000 salary and another $1500 from my Etsy store"

## Intent: `ADD_ASSET`
**Description**: User records a new asset or updates an existing asset's value.

### TaskType: `LOG`
- **Label**: Record new asset
- **Valid Slots (Entities)**: `{assetType}`, `{assetName}`, `{amount}`, `{purchaseDate}`
- **Examples**: 
  - "Bought 50 Reliance shares at ₹2400 each"
  - "Invested 50k in Nifty ETF"

### TaskType: `UPDATE_VALUE`
- **Label**: Update existing asset value
- **Valid Slots (Entities)**: `{assetType}`, `{assetName}`, `{amount}`
- **Examples**: 
  - "My flat is now worth 80 lakhs"
  - "Gold holding value updated to ₹1.2L"

## Intent: `ADD_LIABILITY`
**Description**: User records a new loan or debt, or updates outstanding balance.

### TaskType: `LOG`
- **Label**: Record new liability
- **Valid Slots (Entities)**: `{liabilityType}`, `{amount}`, `{interestRate}`, `{tenureMonths}`
- **Examples**: 
  - "Took a personal loan of 3 lakhs at 14% for 24 months"
  - "New home loan 50L at 8.5% from SBI"

### TaskType: `UPDATE_BALANCE`
- **Label**: Update outstanding balance
- **Valid Slots (Entities)**: `{liabilityType}`, `{amount}`
- **Examples**: 
  - "Home loan outstanding is now 45 lakhs"
  - "Credit card remaining balance ₹28000"

## Intent: `REFUND`
**Description**: User received money back — product refund, cashback reward, or bank reversal.

### TaskType: `REFUND`
- **Label**: Product or service refund
- **Valid Slots (Entities)**: `{amount}`, `{merchant}`, `{date}`
- **Examples**: 
  - "Amazon refunded ₹1499 for cancelled order"
  - "Got $45 refund from Target for returned jacket"

### TaskType: `CASHBACK`
- **Label**: Cashback or reward credit
- **Valid Slots (Entities)**: `{amount}`, `{source}`
- **Examples**: 
  - "Got 200 cashback from HDFC credit card"
  - "GPay cashback ₹50 on electricity bill"

### TaskType: `REVERSAL`
- **Label**: Transaction reversal / double debit
- **Valid Slots (Entities)**: `{amount}`, `{merchant}`, `{date}`
- **Examples**: 
  - "Bank reversed the double debit of 5000"
  - "SBI reversed wrong debit of ₹3500"

## Intent: `AFFORDABILITY_CHECK`
**Description**: User wants to know if a purchase is safe given their financial position — immediate, future, or EMI-based.

### TaskType: `QUICK`
- **Label**: Immediate affordability check
- **Valid Slots (Entities)**: `{itemName}`, `{amount}`
- **Examples**: 
  - "Can I afford a MacBook right now?"
  - "Should I buy the iPhone 15 Pro for 1.2L?"

### TaskType: `FUTURE_PLAN`
- **Label**: Future purchase planning
- **Valid Slots (Entities)**: `{itemName}`, `{amount}`, `{targetDate}`
- **Examples**: 
  - "I'm planning to buy a car next year — am I on track for it?"
  - "Help me figure out if I can buy a house in 3 years"

### TaskType: `EMI_IMPACT`
- **Label**: EMI impact on budget
- **Valid Slots (Entities)**: `{itemName}`, `{amount}`, `{loanTenure}`
- **Examples**: 
  - "If I take a car loan, how much EMI can I afford?"
  - "Car le loon 10L ka to EMI kitni hogi aur afford hogi kya?"

### TaskType: `COMPARE`
- **Label**: Buy vs rent or alternative comparison
- **Valid Slots (Entities)**: `{itemName}`, `{amount}`
- **Examples**: 
  - "Should I buy a laptop or take it on EMI?"
  - "Is it better to rent a flat or buy one in Bangalore?"

## Intent: `DEBT_FREEDOM_ANALYSIS`
**Description**: User wants to know when and how they will become debt-free.

### TaskType: `TIMELINE`
- **Label**: Debt-free date
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "When will all my loans be cleared?"
  - "How long will it take to become debt-free?"

### TaskType: `ACCELERATE`
- **Label**: Pay off debt faster
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "How do I become debt-free 2 years earlier?"
  - "What can I do to clear my loans faster?"

### TaskType: `STRATEGY`
- **Label**: Which loan to pay first
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "Which loan should I pay off first?"
  - "Avalanche or snowball — what works for my situation?"

### TaskType: `WHAT_IF`
- **Label**: What if I pay extra?
- **Valid Slots (Entities)**: `{extraPayment}`
- **Examples**: 
  - "If I pay ₹5000 extra each month how much earlier will I be free?"
  - "What if I throw my bonus at the home loan?"

## Intent: `SIP_VS_PREPAY`
**Description**: User has surplus money and wants help deciding between investing and prepaying a loan.

### TaskType: `COMPARE`
- **Label**: SIP vs prepay comparison
- **Valid Slots (Entities)**: `{surplusAmount}`
- **Examples**: 
  - "Should I put my bonus into SIP or prepay home loan?"
  - "Is it better to invest 10k/month or reduce EMI?"

### TaskType: `BREAKEVEN`
- **Label**: At what return does investing beat prepaying?
- **Valid Slots (Entities)**: `{interestRate}`
- **Examples**: 
  - "At what SIP return should I invest instead of prepay?"
  - "My loan is at 9% — what return do I need to justify not prepaying?"

### TaskType: `HYBRID`
- **Label**: Split between SIP and prepayment
- **Valid Slots (Entities)**: `{surplusAmount}`
- **Examples**: 
  - "Can I do both — some SIP and some prepayment?"
  - "Split 20k between SIP and home loan — how?"

## Intent: `LOAN_ANALYSIS`
**Description**: Deep analysis of a specific loan — amortisation, total interest, refinancing, EMI split.

### TaskType: `AMORTISE`
- **Label**: Full amortisation schedule
- **Valid Slots (Entities)**: `{loanType}`, `{loanAmount}`, `{interestRate}`, `{tenureMonths}`
- **Examples**: 
  - "Show me my home loan repayment schedule"
  - "Generate amortisation table for my car loan"

### TaskType: `INTEREST_TOTAL`
- **Label**: Total interest over loan life
- **Valid Slots (Entities)**: `{loanType}`
- **Examples**: 
  - "How much total interest will I pay on my 20-year mortgage?"
  - "Total interest cost on my car loan?"

### TaskType: `REFI_CHECK`
- **Label**: Should I refinance?
- **Valid Slots (Entities)**: `{interestRate}`, `{newRate}`, `{loanOutstanding}`
- **Examples**: 
  - "My home loan is at 10%, should I refinance to 8.5%?"
  - "Is it worth switching lenders for my car loan?"

### TaskType: `EMI_BREAKDOWN`
- **Label**: Principal vs interest for a specific EMI
- **Valid Slots (Entities)**: `{emiNumber}`
- **Examples**: 
  - "In my 24th EMI, how much goes to principal vs interest?"
  - "What's the interest component in my 12th home loan EMI?"

## Intent: `GOAL_PLANNING`
**Description**: Full goal lifecycle — create, track progress, contribute savings, plan monthly amount, and risk-check timeline.

### TaskType: `CREATE`
- **Label**: Create a new goal
- **Valid Slots (Entities)**: `{goalName}`, `{amount}`, `{targetDate}`
- **Examples**: 
  - "I want to save 5 lakhs for Europe trip by December"
  - "Create emergency fund goal of 3L"

### TaskType: `TRACK`
- **Label**: Check goal progress
- **Valid Slots (Entities)**: `{goalName}`
- **Examples**: 
  - "How far am I from my Europe trip goal?"
  - "What's the progress on my emergency fund?"

### TaskType: `CONTRIBUTE`
- **Label**: Add savings to existing goal
- **Valid Slots (Entities)**: `{goalName}`, `{amount}`
- **Examples**: 
  - "Add 10000 to Europe trip goal"
  - "I saved another ₹5000 towards emergency fund"

### TaskType: `PLAN`
- **Label**: Monthly saving needed to hit goal
- **Valid Slots (Entities)**: `{goalName}`, `{amount}`, `{targetDate}`
- **Examples**: 
  - "How much should I save monthly for my car goal by December?"
  - "To reach 5L for Europe trip by June, how much per month?"

### TaskType: `RISK_CHECK`
- **Label**: Am I on track to hit the goal?
- **Valid Slots (Entities)**: `{goalName}`
- **Examples**: 
  - "Am I on track to reach my house down payment goal?"
  - "Will I hit my Europe trip target by December?"

## Intent: `BUDGET_PLANNING`
**Description**: Multi-faceted: create budgets, get utilisation summary, analyse a single category, spot trends, identify risks, get recommendations.

### TaskType: `CREATE`
- **Label**: Create or update a budget
- **Valid Slots (Entities)**: `{category}`, `{amount}`, `{frequency}`
- **Examples**: 
  - "Set ₹8000 monthly budget for groceries"
  - "Create a dining out limit of 5000 per month"

### TaskType: `SUMMARY`
- **Label**: Overall budget utilisation
- **Valid Slots (Entities)**: `{period}`
- **Examples**: 
  - "Show me my overall budget status this month"
  - "How am I doing on my budgets?"

### TaskType: `CATEGORY_STATUS`
- **Label**: Single category budget check
- **Valid Slots (Entities)**: `{category}`
- **Examples**: 
  - "How much of my food budget is left?"
  - "Groceries budget kitna bacha hai?"

### TaskType: `INSIGHTS`
- **Label**: Budget trends and insights
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "Which budgets am I always exceeding?"
  - "Show me budget trends over the past 3 months"

### TaskType: `RISK`
- **Label**: Overspend risk alert
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "Am I at risk of going over budget this month?"
  - "Which budgets might I exceed before month end?"

### TaskType: `RECOMMEND`
- **Label**: Recommend budget allocations
- **Valid Slots (Entities)**: `{salaryAmount}`
- **Examples**: 
  - "Help me create a budget plan for my 80k salary"
  - "Suggest how I should allocate my £3500 take-home"

## Intent: `SPENDING_ANALYSIS`
**Description**: User wants to understand spending patterns — breakdowns, trends, merchant drills, period comparisons.

### TaskType: `BREAKDOWN`
- **Label**: Category-wise spending breakdown
- **Valid Slots (Entities)**: `{period}`
- **Examples**: 
  - "Show my spending breakdown for last month"
  - "Where did my money go this month?"

### TaskType: `TREND`
- **Label**: Spending trend over time
- **Valid Slots (Entities)**: `{period}`, `{category}`
- **Examples**: 
  - "How has my food spending changed over 3 months?"
  - "Show spending trend for dining across last 6 months"

### TaskType: `CATEGORY_DRILL`
- **Label**: Deep dive into one category or merchant
- **Valid Slots (Entities)**: `{category}`, `{merchant}`, `{period}`
- **Examples**: 
  - "Show all my Zomato transactions last month"
  - "All fuel expenses this year"

### TaskType: `COMPARE`
- **Label**: Compare spending across two periods
- **Valid Slots (Entities)**: `{period}`, `{compareWithPeriod}`
- **Examples**: 
  - "How does this month compare to last month?"
  - "Food expenses this month vs last month"

### TaskType: `TOP_MERCHANTS`
- **Label**: Top merchants or categories by spend
- **Valid Slots (Entities)**: `{period}`
- **Examples**: 
  - "Which apps am I spending the most on?"
  - "Top 5 merchants by spend this month"

## Intent: `NET_WORTH_CHECK`
**Description**: User wants to view their total financial position — net worth number, breakdown, trend, or what-if impact.

### TaskType: `TOTAL`
- **Label**: Current net worth number
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "What's my current net worth?"
  - "How much am I worth today?"

### TaskType: `BREAKDOWN`
- **Label**: Assets vs liabilities breakdown
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "Show me all my assets and debts separately"
  - "Break down my net worth — assets vs liabilities"

### TaskType: `TREND`
- **Label**: Net worth growth over time
- **Valid Slots (Entities)**: `{period}`
- **Examples**: 
  - "How has my net worth grown this year?"
  - "Show net worth trend for last 12 months"

### TaskType: `WHAT_IF`
- **Label**: Impact of a decision on net worth
- **Valid Slots (Entities)**: `{itemName}`, `{amount}`
- **Examples**: 
  - "If I buy a flat for 80L, how does that change my net worth?"
  - "What happens to my net worth if I take a 50L home loan?"

## Intent: `CASHFLOW_WARNING`
**Description**: User-triggered or system-triggered cashflow alerts — low balance, burn rate, upcoming commitments, end-of-month projection.

### TaskType: `CHECK`
- **Label**: How much money is left this month?
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "How much money do I have left to spend this month?"
  - "Paisa kitna bacha hai?"

### TaskType: `ALERT`
- **Label**: System cashflow risk alert
- **Valid Slots (Entities)**: `{period}`, `{alertThreshold}`
- **Examples**: 
  - "[SYSTEM] You have spent 85% of your monthly income with 12 days left"
  - "[SYSTEM] Cashflow alert: outflows exceeding inflows this week"

### TaskType: `UPCOMING`
- **Label**: Can I cover upcoming commitments?
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "Can I cover all my EMIs this month?"
  - "Will I have enough for rent after my expenses?"

### TaskType: `PROJECTION`
- **Label**: End-of-month cashflow projection
- **Valid Slots (Entities)**: `{period}`
- **Examples**: 
  - "Based on current spending, will I run out this month?"
  - "Project my cashflow to end of month"

## Intent: `SAVINGS_ADVICE`
**Description**: Personalised advice on how to save more — general tips, category-specific cuts, goal-based optimisation, full plan, or automation.

### TaskType: `GENERAL`
- **Label**: General savings tips
- **Valid Slots (Entities)**: 
- **Examples**: 
  - "How can I save more money each month?"
  - "Give me savings tips"

### TaskType: `CATEGORY`
- **Label**: Save on a specific category
- **Valid Slots (Entities)**: `{category}`
- **Examples**: 
  - "How do I reduce my food delivery spend?"
  - "Tips to cut down on dining out"

### TaskType: `OPTIMISE`
- **Label**: Optimise savings rate for a goal
- **Valid Slots (Entities)**: `{goalName}`
- **Examples**: 
  - "How do I save faster for my Europe trip?"
  - "I need to hit my emergency fund goal by June — how?"

### TaskType: `PLAN`
- **Label**: Build a full monthly savings plan
- **Valid Slots (Entities)**: `{salaryAmount}`
- **Examples**: 
  - "Create a savings plan for my 80k salary"
  - "How should I split my £3200 take-home between spending and saving?"

### TaskType: `AUTOMATE`
- **Label**: Automate savings strategy
- **Valid Slots (Entities)**: `{salaryAmount}`
- **Examples**: 
  - "Should I set up auto-debit to save each month?"
  - "How do I automate my savings?"

## Intent: `UNKNOWN`
**Description**: Out-of-scope request with no financial intent. Graceful fallback.

