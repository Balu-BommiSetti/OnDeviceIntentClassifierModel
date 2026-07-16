// ═══════════════════════════════════════════════════════════════════════════════
//  WealthPilot — Intent & Sub-Intent Taxonomy  v2.0.0
//  Covers: Intent Classification · NER · Slot Filling · Sub-Intent Routing
// ═══════════════════════════════════════════════════════════════════════════════
//
//  ARCHITECTURE ANSWER — "How do we handle many query types under one intent?"
//
//  Every intent now has a `subIntent` field.
//  The model predicts BOTH the top-level intent AND the sub-intent in one pass.
//  The sub-intent tells the response layer WHAT to do; the intent tells it
//  WHICH handler to invoke.
//
//  Example:
//    User: "I'm planning to buy a car next year — am I on budget for it?"
//    → intent:    AFFORDABILITY_CHECK
//    → subIntent: FUTURE_PLAN
//    → slots:     { itemName: "car", targetDate: "next year" }
//
//    User: "Set ₹8000 monthly budget for groceries"
//    → intent:    BUDGET_PLANNING
//    → subIntent: CREATE
//    → slots:     { category: "groceries", amount: 8000, frequency: "monthly" }
//
//    User: "Which budgets am I always blowing?"
//    → intent:    BUDGET_PLANNING
//    → subIntent: INSIGHTS
//    → slots:     {}
//
//  The routing rules below are keyword/pattern heuristics that generate
//  training labels. At inference time the model learns to predict sub-intent
//  directly from utterance — no rule engine is needed in production.
// ═══════════════════════════════════════════════════════════════════════════════

export type Region = "US" | "UK" | "UAE" | "IN" | "AU" | "CA";

export type StyleCategory =
  | "direct"
  | "conversational"
  | "professional"
  | "banking"
  | "informal"
  | "voice_to_text"
  | "long_narrative"
  | "short_fragment"
  | "typo"
  | "grammar_mistake"
  | "abbreviation"
  | "currency_variation"
  | "regional_vocab"
  | "ambiguous"
  | "adversarial";

// ─── TOP-LEVEL INTENTS ────────────────────────────────────────────────────────

export type Intent =
  | "ADD_INCOME"
  | "ADD_EXPENSE"
  | "INCOME_DECLARATION"
  | "ADD_ASSET"
  | "ADD_LIABILITY"
  | "REFUND"
  | "AFFORDABILITY_CHECK"
  | "DEBT_FREEDOM_ANALYSIS"
  | "SIP_VS_PREPAY"
  | "LOAN_ANALYSIS"
  | "GOAL_PLANNING"
  | "BUDGET_PLANNING"
  | "SPENDING_ANALYSIS"
  | "NET_WORTH_CHECK"
  | "CASHFLOW_WARNING"
  | "SAVINGS_ADVICE"
  | "UNKNOWN";

// ─── SUB-INTENTS PER INTENT ───────────────────────────────────────────────────

export type SubIntent_ADD_INCOME         = "LOG" | "RECURRING";
export type SubIntent_ADD_EXPENSE        = "LOG" | "SPLIT" | "REIMBURSABLE";
export type SubIntent_INCOME_DECLARATION = "MONTHLY_SALARY" | "ANNUAL" | "VARIABLE" | "MULTIPLE_SOURCES";
export type SubIntent_ADD_ASSET          = "LOG" | "UPDATE_VALUE";
export type SubIntent_ADD_LIABILITY      = "LOG" | "UPDATE_BALANCE";
export type SubIntent_REFUND             = "REFUND" | "CASHBACK" | "REVERSAL";
export type SubIntent_AFFORDABILITY      = "QUICK" | "FUTURE_PLAN" | "EMI_IMPACT" | "COMPARE";
export type SubIntent_DEBT_FREEDOM       = "TIMELINE" | "ACCELERATE" | "STRATEGY" | "WHAT_IF";
export type SubIntent_SIP_VS_PREPAY      = "COMPARE" | "BREAKEVEN" | "HYBRID";
export type SubIntent_LOAN_ANALYSIS      = "AMORTISE" | "INTEREST_TOTAL" | "REFI_CHECK" | "EMI_BREAKDOWN";
export type SubIntent_GOAL_PLANNING      = "CREATE" | "TRACK" | "CONTRIBUTE" | "PLAN" | "RISK_CHECK";
export type SubIntent_BUDGET_PLANNING    = "CREATE" | "SUMMARY" | "CATEGORY_STATUS" | "INSIGHTS" | "RISK" | "RECOMMEND";
export type SubIntent_SPENDING_ANALYSIS  = "BREAKDOWN" | "TREND" | "CATEGORY_DRILL" | "COMPARE" | "TOP_MERCHANTS";
export type SubIntent_NET_WORTH          = "TOTAL" | "BREAKDOWN" | "TREND" | "WHAT_IF";
export type SubIntent_CASHFLOW_WARNING   = "CHECK" | "ALERT" | "UPCOMING" | "PROJECTION";
export type SubIntent_SAVINGS_ADVICE     = "GENERAL" | "CATEGORY" | "OPTIMISE" | "PLAN" | "AUTOMATE";

export type SubIntent =
  | SubIntent_ADD_INCOME | SubIntent_ADD_EXPENSE | SubIntent_INCOME_DECLARATION
  | SubIntent_ADD_ASSET | SubIntent_ADD_LIABILITY | SubIntent_REFUND
  | SubIntent_AFFORDABILITY | SubIntent_DEBT_FREEDOM | SubIntent_SIP_VS_PREPAY
  | SubIntent_LOAN_ANALYSIS | SubIntent_GOAL_PLANNING | SubIntent_BUDGET_PLANNING
  | SubIntent_SPENDING_ANALYSIS | SubIntent_NET_WORTH | SubIntent_CASHFLOW_WARNING
  | SubIntent_SAVINGS_ADVICE;

// ─── ENTITY / SLOT SCHEMA ─────────────────────────────────────────────────────

export interface SlotSchema {
  // Monetary
  amount?:           string;   // "500", "₹75k", "1.5 lakhs", "50 quid"
  currency?:         string;   // "INR", "USD", "AED", "GBP"
  targetAmount?:     string;   // for goals
  surplusAmount?:    string;   // for SIP vs prepay
  downPayment?:      string;   // for affordability
  extraPayment?:     string;   // for debt acceleration

  // Date / Time
  date?:             string;   // "today", "last Monday", "on 5th"
  targetDate?:       string;   // "by December", "next year", "in 6 months"
  startDate?:        string;
  endDate?:          string;
  period?:           string;   // "this month", "last 3 months"
  compareWithPeriod?:string;   // for COMPARE sub-intent
  emiNumber?:        number;   // for EMI_BREAKDOWN

  // Transaction entities
  category?:         string;   // "groceries", "dining out", "fuel"
  merchant?:         string;   // "Swiggy", "Amazon", "Tesco"
  paymentMethod?:    string;   // "UPI", "credit card", "Monzo"
  source?:           string;   // income source: "salary", "freelance"
  notes?:            string;
  splitWith?:        string;   // SPLIT sub-intent

  // Asset / Liability
  assetType?:        string;   // "gold", "mutual funds", "real estate"
  assetName?:        string;   // "Nifty ETF", "Reliance shares"
  quantity?:         number;
  purchasePrice?:    string;
  purchaseDate?:     string;
  liabilityType?:    string;   // "home loan", "credit card debt"
  interestRate?:     string;   // "8.5%", "14% APR"
  tenureMonths?:     number;
  emiAmount?:        string;
  lender?:           string;
  newRate?:          string;   // for REFI_CHECK

  // Goal
  goalName?:         string;   // "Europe trip", "emergency fund"
  currentSaved?:     string;
  monthlyContribution?: string;

  // Budget
  frequency?:        string;   // "monthly", "weekly", "annually"
  salaryAmount?:     string;   // for RECOMMEND sub-intent
  alertThreshold?:   string;   // for CASHFLOW_WARNING

  // Affordability
  itemName?:         string;   // "iPhone", "car", "MacBook"
  loanTenure?:       number;

  // Income declaration
  secondaryAmount?:  string;
  secondarySource?:  string;

  // Loan analysis
  loanType?:         string;
  loanAmount?:       string;
  loanOutstanding?:  string;

  // Savings / advisory
  currentSavingsRate?: string;
  targetSavingsRate?:  string;

  // NER action verbs (carry sentiment / confidence signal)
  spend_action?:     string;   // "spent", "blown", "dropped"
  salary_action?:    string;   // "received", "earned", "credited"
  limit_action?:     string;   // "set", "cap", "restrict"
}

// ─── TRAINING SAMPLE SCHEMA ──────────────────────────────────────────────────

export interface TrainingSample {
  id:                  string;
  intent:              Intent;
  subIntent:           SubIntent | null;  // null only for UNKNOWN
  utterance:           string;
  style:               StyleCategory;
  region:              Region;
  split:               "train" | "val" | "test";
  slots_filled:        Partial<SlotSchema>;
  entities_token_iob:  IOBEntity[];
  routing_signals:     string[];  // keywords that triggered sub-intent decision
}

export interface IOBEntity {
  text:   string;
  label:  keyof SlotSchema;
  range:  [number, number];
  iob:    string[];
}

// ─── INTENT DEFINITIONS WITH ROUTING RULES ───────────────────────────────────

export interface SubIntentDef {
  code:         string;
  label:        string;
  description:  string;
  routingHints: string[];   // keyword/pattern signals for this sub-intent
  defaultSlots: (keyof SlotSchema)[];
  exampleUtterances: string[];
}

export interface IntentDef {
  id:             Intent;
  group:          "transactional" | "analytical" | "planning" | "advisory";
  description:    string;
  subIntents:     SubIntentDef[];
  defaultSubIntent: string;   // fallback when no routing signal matches
  requiredSlots:  (keyof SlotSchema)[];
  optionalSlots:  (keyof SlotSchema)[];
}

export const INTENT_TAXONOMY: IntentDef[] = [

  // ── ADD_INCOME ─────────────────────────────────────────────────────────────
  {
    id: "ADD_INCOME",
    group: "transactional",
    description: "User records money received — salary, freelance, bonus, interest, cashback, etc.",
    defaultSubIntent: "LOG",
    requiredSlots: ["amount"],
    optionalSlots: ["source", "date", "frequency", "notes", "currency", "salary_action"],
    subIntents: [
      {
        code: "LOG",
        label: "Log new income entry",
        description: "Single, one-time income event.",
        routingHints: [],   // default
        defaultSlots: ["amount", "source", "date"],
        exampleUtterances: [
          "Salary credited ₹75000 today",
          "Received freelance payment of 15k from client",
          "Got bonus of 10000",
          "aaj salary aaya 80k",
          "Dividend income $250 deposited",
          "Client paid £1200 yesterday",
          "Earned AED 3500 from consulting",
        ],
      },
      {
        code: "RECURRING",
        label: "Mark income as recurring",
        description: "User signals income repeats on a schedule.",
        routingHints: ["every month", "monthly", "each month", "weekly", "recurring", "regular", "per month", "bi-weekly", "annually", "har mahine"],
        defaultSlots: ["amount", "source", "frequency"],
        exampleUtterances: [
          "My monthly salary is 1.2 lakhs",
          "I get paid $5000 every two weeks",
          "Freelance income of £800 comes in every month",
          "Rental income of AED 4000 monthly",
          "I earn 90k every month from my job",
        ],
      },
    ],
  },

  // ── ADD_EXPENSE ────────────────────────────────────────────────────────────
  {
    id: "ADD_EXPENSE",
    group: "transactional",
    description: "User records an outgoing payment with category, merchant, method, and date.",
    defaultSubIntent: "LOG",
    requiredSlots: ["amount"],
    optionalSlots: ["category", "merchant", "paymentMethod", "date", "notes", "currency", "spend_action", "splitWith"],
    subIntents: [
      {
        code: "LOG",
        label: "Record a single expense",
        description: "Standard one-time outgoing payment.",
        routingHints: ["log", "record"],
        defaultSlots: ["amount", "category", "merchant", "date"],
        exampleUtterances: [
          "Spent 500 on groceries today",
          "Paid electricity bill 1200",
          "Ordered food from Zomato for 350 using GPay",
          "DMart pe 3k spend hua aaj",
          "Bought new shoes at Nike for $120",
          "Forked out £85 at Tesco this morning",
          "Cleared petrol bill AED 200 at ENOC",
          "just dropped 2000 on a new headset",
          "blew forty bucks at Starbucks mate",
        ],
      },
      {
        code: "SPLIT",
        label: "Shared / split expense",
        description: "Expense is divided between multiple people.",
        routingHints: ["split", "divide", "shared", "between us", "half", "each", "share", "dutch", "splitting with"],
        defaultSlots: ["amount", "category", "merchant", "splitWith"],
        exampleUtterances: [
          "Split dinner bill 2400 with Rahul and Priya",
          "Divided rent ₹30000 between 3 of us",
          "Shared Uber ride $45 with Sarah",
          "Going dutch on the restaurant bill £120 with Mike",
          "Splitting groceries $200 between 4 flatmates",
          "Pay my half of Netflix AUD 9.99",
        ],
      },
      {
        code: "REIMBURSABLE",
        label: "Expense to be reimbursed",
        description: "User paid on behalf of company or someone and expects money back.",
        routingHints: ["claim", "reimburse", "reimbursement", "office", "expense claim", "company", "work expense", "will get back", "get refunded"],
        defaultSlots: ["amount", "category", "merchant", "notes"],
        exampleUtterances: [
          "Paid 3000 for office supplies, will claim back from company",
          "Bought stationery $150 for work — reimbursable",
          "Paid for team dinner £400, expense claim pending",
          "Company trip petrol ₹2500, need to reimburse",
          "Bought printer ink AED 120 for office, will get refunded",
        ],
      },
    ],
  },

  // ── INCOME_DECLARATION ─────────────────────────────────────────────────────
  {
    id: "INCOME_DECLARATION",
    group: "transactional",
    description: "User states their income profile for financial modelling — not a transaction record.",
    defaultSubIntent: "MONTHLY_SALARY",
    requiredSlots: ["amount"],
    optionalSlots: ["frequency", "source", "secondaryAmount", "secondarySource", "currency"],
    subIntents: [
      {
        code: "MONTHLY_SALARY",
        label: "Monthly salary declaration",
        description: "User declares a fixed monthly take-home or salary.",
        routingHints: ["per month", "monthly", "every month", "take home", "salary is", "my pay is", "I make", "I earn"],
        defaultSlots: ["amount", "frequency"],
        exampleUtterances: [
          "My monthly salary is 1.2 lakhs",
          "I make $7500 per month",
          "Take home pay is £3200 a month",
          "Meri salary 70k per month hai",
          "I earn AED 18000 every month",
          "My pay is CAD 5500 monthly",
        ],
      },
      {
        code: "ANNUAL",
        label: "Annual / CTC income declaration",
        description: "User declares yearly income or CTC.",
        routingHints: ["per year", "annually", "CTC", "a year", "yearly", "annual income", "annual salary", "LPA"],
        defaultSlots: ["amount", "frequency"],
        exampleUtterances: [
          "My CTC is 24 LPA",
          "I earn 18 lakhs a year",
          "Annual income is $90000",
          "My yearly salary is £45000",
          "Total annual compensation is AED 220000",
          "I make about $120k per year",
        ],
      },
      {
        code: "VARIABLE",
        label: "Variable / freelance income",
        description: "Income fluctuates month to month.",
        routingHints: ["varies", "between", "around", "roughly", "freelance", "variable", "not fixed", "sometimes more"],
        defaultSlots: ["amount"],
        exampleUtterances: [
          "My income varies between 50k and 80k a month",
          "I earn roughly $3000–$6000 from freelance",
          "Not fixed but around ₹60000 monthly",
          "My salary varies — around £2800 on a good month",
          "Anywhere from AUD 4000 to 7000 depending on projects",
        ],
      },
      {
        code: "MULTIPLE_SOURCES",
        label: "Multiple income sources",
        description: "User declares income from two or more sources.",
        routingHints: ["plus", "also", "and", "along with", "in addition", "on top of that", "side income", "extra income", "secondary"],
        defaultSlots: ["amount", "source", "secondaryAmount", "secondarySource"],
        exampleUtterances: [
          "Salary is 90k plus 20k from freelance per month",
          "I make $5000 salary and another $1500 from my Etsy store",
          "70k meri salary hai plus rental income 15k",
          "Base pay £2800 and freelance around £600–£1000 extra",
          "AED 15000 from job and AED 3000 dividend monthly",
        ],
      },
    ],
  },

  // ── ADD_ASSET ──────────────────────────────────────────────────────────────
  {
    id: "ADD_ASSET",
    group: "transactional",
    description: "User records a new asset or updates an existing asset's value.",
    defaultSubIntent: "LOG",
    requiredSlots: ["assetType"],
    optionalSlots: ["assetName", "amount", "quantity", "purchasePrice", "purchaseDate", "currency"],
    subIntents: [
      {
        code: "LOG",
        label: "Record new asset",
        description: "Adding a new holding to the portfolio.",
        routingHints: ["bought", "purchased", "invested in", "added", "acquired", "kharida", "liya"],
        defaultSlots: ["assetType", "assetName", "amount", "purchaseDate"],
        exampleUtterances: [
          "Bought 50 Reliance shares at ₹2400 each",
          "Invested 50k in Nifty ETF",
          "Added 1 tola gold worth ₹60000",
          "Purchased Bitcoin worth $2000",
          "Bought HDFC Mutual Fund 10000 units",
          "Acquired property worth AED 800000",
          "Got S&P 500 ETF for $5000",
        ],
      },
      {
        code: "UPDATE_VALUE",
        label: "Update existing asset value",
        description: "Marking current market value of an existing asset.",
        routingHints: ["now worth", "current value", "updated to", "revalued", "market value", "valued at now", "price changed"],
        defaultSlots: ["assetType", "assetName", "amount"],
        exampleUtterances: [
          "My flat is now worth 80 lakhs",
          "Gold holding value updated to ₹1.2L",
          "Tesla stock position now worth $8500",
          "Reliance shares current value is ₹3.5 lakhs",
          "My SIP corpus is now AUD 45000",
        ],
      },
    ],
  },

  // ── ADD_LIABILITY ──────────────────────────────────────────────────────────
  {
    id: "ADD_LIABILITY",
    group: "transactional",
    description: "User records a new loan or debt, or updates outstanding balance.",
    defaultSubIntent: "LOG",
    requiredSlots: ["liabilityType", "amount"],
    optionalSlots: ["interestRate", "tenureMonths", "emiAmount", "lender", "currency"],
    subIntents: [
      {
        code: "LOG",
        label: "Record new liability",
        description: "Adding a new debt or loan.",
        routingHints: ["took", "borrowed", "new loan", "took out", "opened", "sanctioned", "availed"],
        defaultSlots: ["liabilityType", "amount", "interestRate", "tenureMonths"],
        exampleUtterances: [
          "Took a personal loan of 3 lakhs at 14% for 24 months",
          "New home loan 50L at 8.5% from SBI",
          "Credit card debt 45000",
          "Borrowed £5000 personal loan at 9.9% APR",
          "Availed car loan AED 80000 at 4.5%",
          "Student loan $30000 at 6.5% interest",
        ],
      },
      {
        code: "UPDATE_BALANCE",
        label: "Update outstanding balance",
        description: "User states the remaining amount on an existing loan.",
        routingHints: ["outstanding", "balance", "remaining", "still owe", "left on", "pending", "baaki hai"],
        defaultSlots: ["liabilityType", "amount"],
        exampleUtterances: [
          "Home loan outstanding is now 45 lakhs",
          "Credit card remaining balance ₹28000",
          "Still owe $18000 on my student loan",
          "Mortgage balance updated to £180000",
          "Car loan baaki hai 3.5 lakh",
        ],
      },
    ],
  },

  // ── REFUND ─────────────────────────────────────────────────────────────────
  {
    id: "REFUND",
    group: "transactional",
    description: "User received money back — product refund, cashback reward, or bank reversal.",
    defaultSubIntent: "REFUND",
    requiredSlots: ["amount"],
    optionalSlots: ["merchant", "source", "date", "originalCategory", "currency"],
    subIntents: [
      {
        code: "REFUND",
        label: "Product or service refund",
        description: "Merchant returned money for a returned or cancelled item.",
        routingHints: ["refund", "returned", "cancelled order", "return", "gave back", "refunded"],
        defaultSlots: ["amount", "merchant", "date"],
        exampleUtterances: [
          "Amazon refunded ₹1499 for cancelled order",
          "Got $45 refund from Target for returned jacket",
          "Flipkart returned 2300 for defective product",
          "Received £89 refund from Currys",
          "Myntra ne 1800 refund diya",
        ],
      },
      {
        code: "CASHBACK",
        label: "Cashback or reward credit",
        description: "Bank or app credited cashback or reward points as money.",
        routingHints: ["cashback", "reward", "points credited", "cash reward", "offer", "discount credited"],
        defaultSlots: ["amount", "source"],
        exampleUtterances: [
          "Got 200 cashback from HDFC credit card",
          "GPay cashback ₹50 on electricity bill",
          "Amazon Pay cashback $15 from Prime Day",
          "Received £12 reward from Monzo",
          "Paytm cashback 75 rupees mila",
          "5% cashback AED 85 from Liv card",
        ],
      },
      {
        code: "REVERSAL",
        label: "Transaction reversal / double debit",
        description: "Bank reversed a failed or duplicate transaction.",
        routingHints: ["reversal", "reversed", "double debit", "erroneously debited", "duplicate charge", "wrong debit", "bank reversed"],
        defaultSlots: ["amount", "merchant", "date"],
        exampleUtterances: [
          "Bank reversed the double debit of 5000",
          "SBI reversed wrong debit of ₹3500",
          "HDFC credited back erroneously debited 2000",
          "Lloyds reversed duplicate charge of £350",
          "UPI transaction failed but amount reversed 1200",
        ],
      },
    ],
  },

  // ── AFFORDABILITY_CHECK ────────────────────────────────────────────────────
  {
    id: "AFFORDABILITY_CHECK",
    group: "planning",
    description: "User wants to know if a purchase is safe given their financial position — immediate, future, or EMI-based.",
    defaultSubIntent: "QUICK",
    requiredSlots: ["itemName"],
    optionalSlots: ["amount", "targetDate", "downPayment", "loanTenure", "currency"],
    subIntents: [
      {
        code: "QUICK",
        label: "Immediate affordability check",
        description: "Can I buy this thing right now?",
        routingHints: ["can I afford", "should I buy", "is it ok to buy", "can I buy", "afford this", "right now", "today"],
        defaultSlots: ["itemName", "amount"],
        exampleUtterances: [
          "Can I afford a MacBook right now?",
          "Should I buy the iPhone 15 Pro for 1.2L?",
          "Is it safe to spend 80k on a camera?",
          "kya main ab yeh laptop khareed sakta hoon",
          "Can I buy a PS5 for $600?",
          "Is this AED 3500 watch affordable for me?",
          "Afford karna theek hai kya 50000 ka ghadi",
        ],
      },
      {
        code: "FUTURE_PLAN",
        label: "Future purchase planning",
        description: "User plans a big purchase in the future and wants to know if they'll be on track.",
        routingHints: ["next year", "by", "planning to buy", "in 6 months", "future", "someday", "eventually", "agle saal", "by March", "by December"],
        defaultSlots: ["itemName", "amount", "targetDate"],
        exampleUtterances: [
          "I'm planning to buy a car next year — am I on track for it?",
          "Help me figure out if I can buy a house in 3 years",
          "Planning to buy a MacBook Pro by June — is that realistic?",
          "Agle saal car lena hai, kya afford hoga?",
          "Thinking of getting a flat in 2 years, can I plan for it?",
          "I want a Rolex by end of next year, am I on budget?",
          "Can I realistically afford a foreign trip by December on my salary?",
          "Planning to upgrade my bike next year — will I be ready financially?",
        ],
      },
      {
        code: "EMI_IMPACT",
        label: "EMI impact on budget",
        description: "User wants to understand how a loan EMI will affect their monthly cashflow.",
        routingHints: ["EMI", "loan", "monthly payment", "instalment", "finance", "on credit", "pay monthly", "kist"],
        defaultSlots: ["itemName", "amount", "loanTenure"],
        exampleUtterances: [
          "If I take a car loan, how much EMI can I afford?",
          "Car le loon 10L ka to EMI kitni hogi aur afford hogi kya?",
          "If I finance this iPhone on 12-month plan, can I manage it?",
          "Home loan EMI ka asar mere budget pe kya hoga?",
          "Should I buy the bike on EMI at ₹5000/month?",
          "If I put $200/month on credit for the laptop, will it hurt my budget?",
          "Kist pe lena safe hai kya is laptop ke liye?",
        ],
      },
      {
        code: "COMPARE",
        label: "Buy vs rent or alternative comparison",
        description: "User wants to compare two options before committing.",
        routingHints: ["or", "vs", "versus", "rent vs buy", "alternative", "better to", "should I rent or buy", "compare"],
        defaultSlots: ["itemName", "amount"],
        exampleUtterances: [
          "Should I buy a laptop or take it on EMI?",
          "Is it better to rent a flat or buy one in Bangalore?",
          "Should I buy a car or use Ola/Uber?",
          "Buy vs lease — which is better for me?",
          "Is it smarter to upgrade my phone now or wait till next year?",
          "New car vs second-hand — which fits my budget better?",
        ],
      },
    ],
  },

  // ── DEBT_FREEDOM_ANALYSIS ──────────────────────────────────────────────────
  {
    id: "DEBT_FREEDOM_ANALYSIS",
    group: "planning",
    description: "User wants to know when and how they will become debt-free.",
    defaultSubIntent: "TIMELINE",
    requiredSlots: [],
    optionalSlots: ["extraPayment", "targetDate", "loanType", "loanOutstanding"],
    subIntents: [
      {
        code: "TIMELINE",
        label: "Debt-free date",
        description: "When will I clear all my debts?",
        routingHints: ["when", "how long", "how many years", "how many months", "debt free date", "freedom date"],
        defaultSlots: [],
        exampleUtterances: [
          "When will all my loans be cleared?",
          "How long will it take to become debt-free?",
          "Mera karz kab khatam hoga?",
          "Show me my debt freedom date",
          "How many more years to pay off my home loan?",
        ],
      },
      {
        code: "ACCELERATE",
        label: "Pay off debt faster",
        description: "How can I become debt-free earlier?",
        routingHints: ["faster", "earlier", "sooner", "accelerate", "quickly", "speed up", "reduce tenure", "prepay"],
        defaultSlots: [],
        exampleUtterances: [
          "How do I become debt-free 2 years earlier?",
          "What can I do to clear my loans faster?",
          "I want to pay off home loan 5 years sooner — how?",
          "Loan jaldi khatam karna hai, kya karna chahiye?",
          "Strategies to accelerate my debt payoff",
        ],
      },
      {
        code: "STRATEGY",
        label: "Which loan to pay first",
        description: "Avalanche vs snowball — advise on payoff order.",
        routingHints: ["which loan first", "avalanche", "snowball", "priority", "order", "pehle kaun sa", "which first", "start with"],
        defaultSlots: [],
        exampleUtterances: [
          "Which loan should I pay off first?",
          "Avalanche or snowball — what works for my situation?",
          "Should I clear credit card or personal loan first?",
          "What order should I pay off my debts?",
          "Pehle credit card clear karoon ya personal loan?",
        ],
      },
      {
        code: "WHAT_IF",
        label: "What if I pay extra?",
        description: "Model impact of an additional payment each month.",
        routingHints: ["if I pay extra", "extra payment", "if I add", "suppose", "if I put", "hypothetically", "what if I prepay"],
        defaultSlots: ["extraPayment"],
        exampleUtterances: [
          "If I pay ₹5000 extra each month how much earlier will I be free?",
          "What if I throw my bonus at the home loan?",
          "If I add $500/month to my student loan payoff, what changes?",
          "Agar 10k extra doon har mahine toh kitna jaldi hoga?",
          "Suppose I make a lump sum of 2L — how does it affect my timeline?",
        ],
      },
    ],
  },

  // ── SIP_VS_PREPAY ──────────────────────────────────────────────────────────
  {
    id: "SIP_VS_PREPAY",
    group: "advisory",
    description: "User has surplus money and wants help deciding between investing and prepaying a loan.",
    defaultSubIntent: "COMPARE",
    requiredSlots: [],
    optionalSlots: ["surplusAmount", "interestRate", "loanOutstanding"],
    subIntents: [
      {
        code: "COMPARE",
        label: "SIP vs prepay comparison",
        description: "Side-by-side analysis: which gives better financial outcome?",
        routingHints: ["SIP or prepay", "invest or pay off", "compare", "which is better", "vs", "or"],
        defaultSlots: ["surplusAmount"],
        exampleUtterances: [
          "Should I put my bonus into SIP or prepay home loan?",
          "Is it better to invest 10k/month or reduce EMI?",
          "Invest karoon ya loan bhardoon?",
          "Compare investing vs prepaying my mortgage",
          "SIP vs home loan prepayment — which wins?",
        ],
      },
      {
        code: "BREAKEVEN",
        label: "At what return does investing beat prepaying?",
        description: "Find the return threshold where SIP becomes more valuable.",
        routingHints: ["what rate", "breakeven", "at what return", "threshold", "minimum return", "when does investing make sense"],
        defaultSlots: ["interestRate"],
        exampleUtterances: [
          "At what SIP return should I invest instead of prepay?",
          "My loan is at 9% — what return do I need to justify not prepaying?",
          "What's the breakeven return rate between SIP and prepayment?",
          "At what mutual fund CAGR does investing beat loan prepayment?",
        ],
      },
      {
        code: "HYBRID",
        label: "Split between SIP and prepayment",
        description: "User wants to do both — model an optimal split.",
        routingHints: ["both", "split", "some in SIP", "partial", "half and half", "divide", "combination"],
        defaultSlots: ["surplusAmount"],
        exampleUtterances: [
          "Can I do both — some SIP and some prepayment?",
          "Split 20k between SIP and home loan — how?",
          "Half in mutual funds and half in loan prepayment — good idea?",
          "What's the right mix of investing vs prepaying for me?",
          "Thoda SIP mein daaloon aur thoda loan mein — kya sahi hai?",
        ],
      },
    ],
  },

  // ── LOAN_ANALYSIS ──────────────────────────────────────────────────────────
  {
    id: "LOAN_ANALYSIS",
    group: "planning",
    description: "Deep analysis of a specific loan — amortisation, total interest, refinancing, EMI split.",
    defaultSubIntent: "AMORTISE",
    requiredSlots: [],
    optionalSlots: ["loanType", "loanAmount", "interestRate", "tenureMonths", "emiNumber", "newRate"],
    subIntents: [
      {
        code: "AMORTISE",
        label: "Full amortisation schedule",
        description: "Show all EMIs with principal/interest split over entire tenure.",
        routingHints: ["schedule", "amortization", "amortisation", "repayment plan", "table", "all EMIs", "full breakdown"],
        defaultSlots: ["loanType", "loanAmount", "interestRate", "tenureMonths"],
        exampleUtterances: [
          "Show me my home loan repayment schedule",
          "Generate amortisation table for my car loan",
          "Full EMI breakdown for 50L home loan at 8.5% for 20 years",
          "Show all monthly payments for my student loan",
        ],
      },
      {
        code: "INTEREST_TOTAL",
        label: "Total interest over loan life",
        description: "How much total interest will be paid by the end of the loan?",
        routingHints: ["total interest", "how much interest", "overall interest", "interest I will pay", "over the entire loan", "by end of tenure"],
        defaultSlots: ["loanType"],
        exampleUtterances: [
          "How much total interest will I pay on my 20-year mortgage?",
          "Total interest cost on my car loan?",
          "How much extra am I paying the bank over the life of my home loan?",
          "Home loan mein total kitna interest bharunga?",
        ],
      },
      {
        code: "REFI_CHECK",
        label: "Should I refinance?",
        description: "Analyse if switching to a lower rate saves money.",
        routingHints: ["refinance", "re-finance", "switch lender", "lower rate", "better rate", "balance transfer", "should I move my loan", "repo rate cut"],
        defaultSlots: ["interestRate", "newRate", "loanOutstanding"],
        exampleUtterances: [
          "My home loan is at 10%, should I refinance to 8.5%?",
          "Is it worth switching lenders for my car loan?",
          "Repo rate dropped — should I refinance?",
          "Balance transfer from HDFC to SBI — worth it?",
          "Should I move my loan to a cheaper bank?",
        ],
      },
      {
        code: "EMI_BREAKDOWN",
        label: "Principal vs interest for a specific EMI",
        description: "How much of EMI number N goes to principal vs interest?",
        routingHints: ["24th EMI", "nth EMI", "specific EMI", "this month's EMI", "principal vs interest", "split for month"],
        defaultSlots: ["emiNumber"],
        exampleUtterances: [
          "In my 24th EMI, how much goes to principal vs interest?",
          "What's the interest component in my 12th home loan EMI?",
          "24th EMI mein principal aur interest kitna hai?",
          "Show the breakdown of my 36th car loan payment",
        ],
      },
    ],
  },

  // ── GOAL_PLANNING ──────────────────────────────────────────────────────────
  {
    id: "GOAL_PLANNING",
    group: "planning",
    description: "Full goal lifecycle — create, track progress, contribute savings, plan monthly amount, and risk-check timeline.",
    defaultSubIntent: "CREATE",
    requiredSlots: ["goalName"],
    optionalSlots: ["amount", "targetDate", "currentSaved", "monthlyContribution", "currency"],
    subIntents: [
      {
        code: "CREATE",
        label: "Create a new goal",
        description: "Set up a new savings target.",
        routingHints: ["create goal", "new goal", "save for", "set a goal", "planning to", "want to save", "goal banao"],
        defaultSlots: ["goalName", "amount", "targetDate"],
        exampleUtterances: [
          "I want to save 5 lakhs for Europe trip by December",
          "Create emergency fund goal of 3L",
          "New goal: house down payment, target 20L by 2026",
          "Europe trip ke liye goal set karo 5L ka",
          "Set up retirement fund goal — 2 crore in 20 years",
          "I want to save $10000 for a vacation by next summer",
        ],
      },
      {
        code: "TRACK",
        label: "Check goal progress",
        description: "How far am I from my goal?",
        routingHints: ["how far", "progress", "status", "how much left", "how close", "kitna bacha", "remaining", "check goal"],
        defaultSlots: ["goalName"],
        exampleUtterances: [
          "How far am I from my Europe trip goal?",
          "What's the progress on my emergency fund?",
          "Ghar fund mein kitna bacha hai?",
          "Check my vacation savings goal status",
          "How close am I to my car down payment goal?",
        ],
      },
      {
        code: "CONTRIBUTE",
        label: "Add savings to existing goal",
        description: "Record money saved towards a named goal.",
        routingHints: ["add to goal", "saved towards", "put into", "contributed", "update goal", "daalo", "top up"],
        defaultSlots: ["goalName", "amount"],
        exampleUtterances: [
          "Add 10000 to Europe trip goal",
          "I saved another ₹5000 towards emergency fund",
          "Update house goal — contributed 15k this month",
          "Europe trip mein 8000 aur daalo",
          "Put $500 towards my vacation fund",
          "Top up my retirement corpus by ₹10000",
        ],
      },
      {
        code: "PLAN",
        label: "Monthly saving needed to hit goal",
        description: "Calculate required monthly contribution to reach goal by target date.",
        routingHints: ["how much per month", "monthly saving", "how much should I save", "to reach by", "to hit target", "what's the monthly amount"],
        defaultSlots: ["goalName", "amount", "targetDate"],
        exampleUtterances: [
          "How much should I save monthly for my car goal by December?",
          "To reach 5L for Europe trip by June, how much per month?",
          "Calculate my monthly SIP needed for retirement goal",
          "Har mahine kitna banana chahiye Europe trip ke liye?",
          "What's the monthly saving needed for my house down payment goal?",
          "How much per month to save $15000 for a trip in 18 months?",
        ],
      },
      {
        code: "RISK_CHECK",
        label: "Am I on track to hit the goal?",
        description: "Check if current saving rate will meet the goal by deadline.",
        routingHints: ["on track", "will I reach", "will I make it", "at risk", "behind schedule", "am I going to", "kya ho jayega"],
        defaultSlots: ["goalName"],
        exampleUtterances: [
          "Am I on track to reach my house down payment goal?",
          "Will I hit my Europe trip target by December?",
          "Is my retirement savings on pace?",
          "Emergency fund goal — am I behind?",
          "At the current rate will I make my car fund by March?",
          "Goal miss ho jayega kya is rate pe?",
        ],
      },
    ],
  },

  // ── BUDGET_PLANNING ────────────────────────────────────────────────────────
  {
    id: "BUDGET_PLANNING",
    group: "planning",
    description: "Multi-faceted: create budgets, get utilisation summary, analyse a single category, spot trends, identify risks, get recommendations.",
    defaultSubIntent: "SUMMARY",
    requiredSlots: [],
    optionalSlots: ["category", "amount", "frequency", "period", "salaryAmount", "currency"],
    subIntents: [
      {
        code: "CREATE",
        label: "Create or update a budget",
        description: "Set a spending limit for a category.",
        routingHints: ["set budget", "create budget", "limit", "cap", "restrict", "set limit", "allocate", "define budget", "budget banao"],
        defaultSlots: ["category", "amount", "frequency"],
        exampleUtterances: [
          "Set ₹8000 monthly budget for groceries",
          "Create a dining out limit of 5000 per month",
          "Cap my entertainment spending at $200",
          "I want to limit fuel expenses to ₹3000/month",
          "Set up a travel budget of AUD 500 monthly",
          "Groceries pe 6000 ka budget set karo",
          "Monthly shopping limit £300 please",
        ],
      },
      {
        code: "SUMMARY",
        label: "Overall budget utilisation",
        description: "How am I doing across all budget categories this month?",
        routingHints: ["budget status", "how am I doing", "overview", "all budgets", "budget summary", "this month's budget", "overall", "analyze my budget", "analyze budget"],
        defaultSlots: ["period"],
        exampleUtterances: [
          "Show me my overall budget status this month",
          "How am I doing on my budgets?",
          "Budget overview for this month please",
          "Is mah ka budget summary dikhao",
          "All categories budget utilisation",
          "Am I within budget this month?",
        ],
      },
      {
        code: "CATEGORY_STATUS",
        label: "Single category budget check",
        description: "How much is left or used in one specific category?",
        routingHints: ["left in", "remaining", "used up", "how much left", "still have", "spent from budget", "kitna bacha"],
        defaultSlots: ["category"],
        exampleUtterances: [
          "How much of my food budget is left?",
          "Groceries budget kitna bacha hai?",
          "Entertainment — how much have I used this month?",
          "Is my dining budget finished?",
          "How much petrol budget remaining?",
          "Utilities budget — what's left?",
        ],
      },
      {
        code: "INSIGHTS",
        label: "Budget trends and insights",
        description: "Which budgets am I always exceeding? What patterns exist?",
        routingHints: ["always exceed", "always over", "trend", "pattern", "every month", "consistently", "habits", "insights", "usually"],
        defaultSlots: [],
        exampleUtterances: [
          "Which budgets am I always exceeding?",
          "Show me budget trends over the past 3 months",
          "Which categories do I consistently overspend?",
          "Any patterns in my budget performance?",
          "Kaunsa budget main hamesha tod deta hoon?",
          "Budget insights for the last quarter",
        ],
      },
      {
        code: "RISK",
        label: "Overspend risk alert",
        description: "Am I at risk of going over any budget before month end?",
        routingHints: ["at risk", "going to exceed", "will I go over", "overspend", "breach", "cross budget", "warning", "budget khatam hoga", "risks with my budget", "budget risk"],
        defaultSlots: [],
        exampleUtterances: [
          "Am I at risk of going over budget this month?",
          "Which budgets might I exceed before month end?",
          "Dining budget khatam hone wala hai kya?",
          "Alert me if I'm close to hitting any limit",
          "Will I stay within my grocery budget this month?",
          "Any budget breach risk this week?",
        ],
      },
      {
        code: "RECOMMEND",
        label: "Recommend budget allocations",
        description: "Help me plan a budget from scratch or optimise existing one.",
        routingHints: ["help me plan", "suggest", "recommend", "what should my budget be", "how to allocate", "create a plan", "salary ka budget", "50-30-20"],
        defaultSlots: ["salaryAmount"],
        exampleUtterances: [
          "Help me create a budget plan for my 80k salary",
          "Suggest how I should allocate my £3500 take-home",
          "80k salary hai — budget kaise banaaon?",
          "What should my budget categories look like on $5000/month?",
          "Recommend a budget plan for me",
          "Apply 50-30-20 rule to my income",
          "I'm planning to buy a car next year — help me build a budget that accounts for that",
        ],
      },
    ],
  },

  // ── SPENDING_ANALYSIS ──────────────────────────────────────────────────────
  {
    id: "SPENDING_ANALYSIS",
    group: "analytical",
    description: "User wants to understand spending patterns — breakdowns, trends, merchant drills, period comparisons.",
    defaultSubIntent: "BREAKDOWN",
    requiredSlots: [],
    optionalSlots: ["period", "category", "merchant", "compareWithPeriod"],
    subIntents: [
      {
        code: "BREAKDOWN",
        label: "Category-wise spending breakdown",
        description: "Where did my money go overall?",
        routingHints: ["breakdown", "where did my money go", "spending summary", "how much did I spend", "show expenses", "kahan gaya paisa", "summarize my spendings"],
        defaultSlots: ["period"],
        exampleUtterances: [
          "Show my spending breakdown for last month",
          "Where did my money go this month?",
          "Spending summary for March",
          "Can you summarize my spendings on food this month",
          "I want to summarize the spendings on food",
          "Summarize my spendings overall",
          "Kahan gaya mera paisa is mahine?",
          "Category-wise expense report",
          "Total spending breakdown last 3 months",
        ],
      },
      {
        code: "TREND",
        label: "Spending trend over time",
        description: "How has spending changed across months?",
        routingHints: ["trend", "over months", "changing", "going up", "increasing", "over time", "history", "past 3 months", "year to date"],
        defaultSlots: ["period", "category"],
        exampleUtterances: [
          "How has my food spending changed over 3 months?",
          "Show spending trend for dining across last 6 months",
          "Is my grocery spend going up or down?",
          "Year to date spending trend",
          "How has my overall spend changed this year?",
        ],
      },
      {
        code: "CATEGORY_DRILL",
        label: "Deep dive into one category or merchant",
        description: "Show all transactions for a specific category or merchant.",
        routingHints: ["show all", "list transactions", "details for", "drill into", "specific merchant", "all Zomato", "all fuel", "filter by"],
        defaultSlots: ["category", "merchant", "period"],
        exampleUtterances: [
          "Show all my Zomato transactions last month",
          "All fuel expenses this year",
          "List every grocery purchase in February",
          "Swiggy orders is month mein dikhao",
          "All Netflix charges this year",
          "Amazon purchases last 90 days",
        ],
      },
      {
        code: "COMPARE",
        label: "Compare spending across two periods",
        description: "This month vs last month, this year vs last year.",
        routingHints: ["compare", "vs", "this vs last", "difference", "change from", "more or less than", "comparison"],
        defaultSlots: ["period", "compareWithPeriod"],
        exampleUtterances: [
          "How does this month compare to last month?",
          "Food expenses this month vs last month",
          "Compare my spending this quarter vs last quarter",
          "Is mahine ka kharcha pichle mahine se zyada hai?",
          "Year over year spending comparison",
        ],
      },
      {
        code: "TOP_MERCHANTS",
        label: "Top merchants or categories by spend",
        description: "Which apps, stores, or categories take the most money?",
        routingHints: ["top", "most", "highest", "biggest", "where I spend most", "largest", "rank"],
        defaultSlots: ["period"],
        exampleUtterances: [
          "Which apps am I spending the most on?",
          "Top 5 merchants by spend this month",
          "Biggest expense categories this quarter",
          "Where does most of my money go?",
          "Kahan sabse zyada kharcha ho raha hai?",
          "Rank my spending categories from highest to lowest",
        ],
      },
    ],
  },

  // ── NET_WORTH_CHECK ────────────────────────────────────────────────────────
  {
    id: "NET_WORTH_CHECK",
    group: "analytical",
    description: "User wants to view their total financial position — net worth number, breakdown, trend, or what-if impact.",
    defaultSubIntent: "TOTAL",
    requiredSlots: [],
    optionalSlots: ["period", "amount", "itemName"],
    subIntents: [
      {
        code: "TOTAL",
        label: "Current net worth number",
        description: "Single consolidated net worth figure.",
        routingHints: ["net worth", "how much am I worth", "my wealth", "total wealth", "financial position", "am I rich"],
        defaultSlots: [],
        exampleUtterances: [
          "What's my current net worth?",
          "How much am I worth today?",
          "Show me my total wealth",
          "Meri net worth kya hai?",
          "Calculate my financial position",
        ],
      },
      {
        code: "BREAKDOWN",
        label: "Assets vs liabilities breakdown",
        description: "List all assets and debts separately.",
        routingHints: ["breakdown", "list assets", "show debts", "assets and liabilities", "what I own", "what I owe", "detail"],
        defaultSlots: [],
        exampleUtterances: [
          "Show me all my assets and debts separately",
          "Break down my net worth — assets vs liabilities",
          "What do I own and what do I owe?",
          "Meri sampatti aur karz ka breakdown dikhao",
          "List all holdings and liabilities",
        ],
      },
      {
        code: "TREND",
        label: "Net worth growth over time",
        description: "How has net worth changed month by month or year by year?",
        routingHints: ["trend", "growing", "over time", "how it changed", "progress", "year", "month by month"],
        defaultSlots: ["period"],
        exampleUtterances: [
          "How has my net worth grown this year?",
          "Show net worth trend for last 12 months",
          "Am I growing my wealth month over month?",
          "Net worth progress report",
          "Is my financial position improving?",
        ],
      },
      {
        code: "WHAT_IF",
        label: "Impact of a decision on net worth",
        description: "If I buy / sell / take a loan — how does net worth change?",
        routingHints: ["if I buy", "if I sell", "impact", "what would happen", "effect on net worth", "if I take a loan"],
        defaultSlots: ["itemName", "amount"],
        exampleUtterances: [
          "If I buy a flat for 80L, how does that change my net worth?",
          "What happens to my net worth if I take a 50L home loan?",
          "If I sell my shares worth 5L, what's my new net worth?",
          "Impact of buying a car on my total wealth",
          "Net worth agar 30L ka loan loon toh?",
        ],
      },
    ],
  },

  // ── CASHFLOW_WARNING ───────────────────────────────────────────────────────
  {
    id: "CASHFLOW_WARNING",
    group: "advisory",
    description: "User-triggered or system-triggered cashflow alerts — low balance, burn rate, upcoming commitments, end-of-month projection.",
    defaultSubIntent: "CHECK",
    requiredSlots: [],
    optionalSlots: ["period", "alertThreshold"],
    subIntents: [
      {
        code: "CHECK",
        label: "How much money is left this month?",
        description: "User asks about remaining spendable balance.",
        routingHints: ["how much left", "how much do I have", "balance", "remaining", "kitna bacha", "available"],
        defaultSlots: [],
        exampleUtterances: [
          "How much money do I have left to spend this month?",
          "Paisa kitna bacha hai?",
          "What's my available balance for the rest of the month?",
          "After all bills, how much do I have?",
          "How much can I still spend?",
        ],
      },
      {
        code: "ALERT",
        label: "System cashflow risk alert",
        description: "Auto-triggered when user has used 80%+ of income with days remaining.",
        routingHints: [],  // system-generated, no user keywords
        defaultSlots: ["period", "alertThreshold"],
        exampleUtterances: [
          "[SYSTEM] You have spent 85% of your monthly income with 12 days left",
          "[SYSTEM] Cashflow alert: outflows exceeding inflows this week",
          "[SYSTEM] You are on track to run out of budget by the 25th",
        ],
      },
      {
        code: "UPCOMING",
        label: "Can I cover upcoming commitments?",
        description: "Check if current balance covers EMIs, rent, etc.",
        routingHints: ["can I cover", "EMI", "rent due", "commitment", "bills", "subscription", "due this month", "will I have enough"],
        defaultSlots: [],
        exampleUtterances: [
          "Can I cover all my EMIs this month?",
          "Will I have enough for rent after my expenses?",
          "Kya is mahine EMI cover ho jayegi?",
          "Do I have enough to pay all my bills this month?",
          "Check if upcoming commitments are covered",
        ],
      },
      {
        code: "PROJECTION",
        label: "End-of-month cashflow projection",
        description: "Based on current spending rate, will I run out?",
        routingHints: ["project", "forecast", "will I run out", "end of month", "at this rate", "by month end"],
        defaultSlots: ["period"],
        exampleUtterances: [
          "Based on current spending, will I run out this month?",
          "Project my cashflow to end of month",
          "At this rate, how much will I have left on the 30th?",
          "Forecast my balance by end of March",
          "Is mahine ka end mein paisa bacha rahega kya?",
        ],
      },
    ],
  },

  // ── SAVINGS_ADVICE ─────────────────────────────────────────────────────────
  {
    id: "SAVINGS_ADVICE",
    group: "advisory",
    description: "Personalised advice on how to save more — general tips, category-specific cuts, goal-based optimisation, full plan, or automation.",
    defaultSubIntent: "GENERAL",
    requiredSlots: [],
    optionalSlots: ["category", "goalName", "salaryAmount", "currentSavingsRate", "targetSavingsRate"],
    subIntents: [
      {
        code: "GENERAL",
        label: "General savings tips",
        description: "Broad advice on how to save more money.",
        routingHints: ["how can I save", "save more money", "savings tips", "help me save", "paise kaise bachaayen"],
        defaultSlots: [],
        exampleUtterances: [
          "How can I save more money each month?",
          "Give me savings tips",
          "Help me cut down expenses",
          "Paise kaise bachaayen?",
          "Ways to save more money",
          "I spend too much — help",
        ],
      },
      {
        code: "CATEGORY",
        label: "Save on a specific category",
        description: "How can I reduce spending in one area?",
        routingHints: ["reduce", "cut down", "spend less on", "save on", "lower my", "trim", "how to cut"],
        defaultSlots: ["category"],
        exampleUtterances: [
          "How do I reduce my food delivery spend?",
          "Tips to cut down on dining out",
          "I spend too much on fuel — what can I do?",
          "Subscriptions pe kharcha kam karna hai",
          "How to spend less on shopping?",
          "Ways to reduce my entertainment budget",
        ],
      },
      {
        code: "OPTIMISE",
        label: "Optimise savings rate for a goal",
        description: "How do I save faster to reach a specific goal?",
        routingHints: ["save faster", "reach goal", "hit target", "optimise for", "accelerate savings", "goal ke liye"],
        defaultSlots: ["goalName"],
        exampleUtterances: [
          "How do I save faster for my Europe trip?",
          "I need to hit my emergency fund goal by June — how?",
          "Optimise my savings to reach house goal faster",
          "Car goal ke liye jaldi kaise bachaoon?",
          "What should I cut to hit my vacation target sooner?",
        ],
      },
      {
        code: "PLAN",
        label: "Build a full monthly savings plan",
        description: "Create a personalised savings blueprint from income.",
        routingHints: ["savings plan", "create a plan", "how should I save", "monthly plan", "budget and save", "plan banao"],
        defaultSlots: ["salaryAmount"],
        exampleUtterances: [
          "Create a savings plan for my 80k salary",
          "How should I split my £3200 take-home between spending and saving?",
          "80k mein se kitna bachana chahiye aur kaise?",
          "Build me a monthly savings blueprint",
          "Suggest a savings structure for $5000/month take-home",
        ],
      },
      {
        code: "AUTOMATE",
        label: "Automate savings strategy",
        description: "Should I set up auto-debit, SIP, or standing order for savings?",
        routingHints: ["automate", "auto", "auto-debit", "SIP", "standing order", "automatic", "set and forget", "auto transfer"],
        defaultSlots: ["salaryAmount"],
        exampleUtterances: [
          "Should I set up auto-debit to save each month?",
          "How do I automate my savings?",
          "Best way to set up automatic savings in India",
          "Should I start an SIP for my savings goal?",
          "Standing order to savings account — good idea?",
          "Auto-save karna chahta hoon — kaise karoon?",
        ],
      },
    ],
  },

  // ── UNKNOWN ────────────────────────────────────────────────────────────────
  {
    id: "UNKNOWN",
    group: "advisory",
    description: "Out-of-scope request with no financial intent. Graceful fallback.",
    defaultSubIntent: "GENERAL",
    requiredSlots: [],
    optionalSlots: [],
    subIntents: [],
  },
];

// ─── SUB-INTENT ROUTING ENGINE ────────────────────────────────────────────────
//
//  This is used at LABEL GENERATION TIME (dataset creation) only.
//  The trained model predicts sub-intent directly — this rule engine is not
//  shipped to production.

export function routeSubIntent(
  intentId: Intent,
  utterance: string
): { subIntent: SubIntent | null; signals: string[] } {
  const def = INTENT_TAXONOMY.find(i => i.id === intentId);
  if (!def || def.subIntents.length === 0) return { subIntent: null, signals: [] };

  const lower = utterance.toLowerCase();
  const signals: string[] = [];

  for (const sub of def.subIntents) {
    const matched = sub.routingHints.filter(hint => lower.includes(hint.toLowerCase()));
    if (matched.length > 0) {
      signals.push(...matched);
      return { subIntent: sub.code as SubIntent, signals };
    }
  }

  return {
    subIntent: def.defaultSubIntent as SubIntent,
    signals: ["[default]"],
  };
}

// ─── METADATA EXPORT ──────────────────────────────────────────────────────────

export const TAXONOMY_METADATA = {
  version: "2.0.0",
  project: "WealthPilot Personal Finance Assistant",
  description: "16-class intent taxonomy with sub-intents, slot schema, and routing logic",
  generatedAt: new Date().toISOString(),
  totalIntents: INTENT_TAXONOMY.length,
  totalSubIntents: INTENT_TAXONOMY.reduce((a, i) => a + i.subIntents.length, 0),
  totalSlots: 35,
  intentGroups: {
    transactional: INTENT_TAXONOMY.filter(i => i.group === "transactional").map(i => i.id),
    analytical:    INTENT_TAXONOMY.filter(i => i.group === "analytical").map(i => i.id),
    planning:      INTENT_TAXONOMY.filter(i => i.group === "planning").map(i => i.id),
    advisory:      INTENT_TAXONOMY.filter(i => i.group === "advisory").map(i => i.id),
  },
};
