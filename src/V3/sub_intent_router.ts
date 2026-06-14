// ═══════════════════════════════════════════════════════════════════════════════
//  WealthPilot — Sub-Intent Router  v2.0.0
//  Production inference-time router that runs AFTER the NLP model predicts
//  the top-level intent. Refines it into a sub-intent using:
//    1. Model-predicted sub_intent (primary — when model supports it)
//    2. Rule-based keyword fallback (secondary — fast, cheap)
//    3. Slot-presence heuristics (tertiary — structural signals)
//
//  Usage:
//    const result = SubIntentRouter.route("BUDGET_PLANNING", utterance, modelOutput);
//    → { subIntent: "RECOMMEND", confidence: 0.91, signals: ["salary", "plan"] }
// ═══════════════════════════════════════════════════════════════════════════════

export type Intent =
  | "ADD_INCOME" | "ADD_EXPENSE" | "INCOME_DECLARATION"
  | "ADD_ASSET" | "ADD_LIABILITY" | "REFUND"
  | "AFFORDABILITY_CHECK" | "DEBT_FREEDOM_ANALYSIS" | "SIP_VS_PREPAY"
  | "LOAN_ANALYSIS" | "GOAL_PLANNING" | "BUDGET_PLANNING"
  | "SPENDING_ANALYSIS" | "NET_WORTH_CHECK" | "CASHFLOW_WARNING"
  | "SAVINGS_ADVICE" | "UNKNOWN";

export interface ModelOutput {
  intent:        Intent;
  intentConf:    number;
  subIntent?:    string;   // present if model was trained with dual-label head
  subIntentConf?: number;
  slots:         Record<string, string>;
}

export interface RoutingResult {
  intent:      Intent;
  subIntent:   string;
  confidence:  number;
  source:      "model" | "rule" | "heuristic" | "default";
  signals:     string[];
}

// ─── ROUTING RULE DEFINITIONS ─────────────────────────────────────────────────
//  Each rule is ordered by PRIORITY (highest first within each intent).
//  First match wins. Rules are evaluated in order.

interface RoutingRule {
  subIntent:  string;
  priority:   number;
  keywords?:  string[];        // ANY of these in the utterance triggers the rule
  patterns?:  RegExp[];        // ANY regex match triggers the rule
  slotCheck?: (slots: Record<string, string>) => boolean;
}

const ROUTING_RULES: Record<Intent, RoutingRule[]> = {

  // ── ADD_INCOME ───────────────────────────────────────────────────────────
  ADD_INCOME: [
    {
      subIntent: "RECURRING",
      priority: 10,
      keywords: ["every month", "monthly", "each month", "weekly", "per month",
                 "recurring", "regular", "bi-weekly", "annually", "har mahine",
                 "each week", "per year", "every year", "yearly"],
    },
    { subIntent: "LOG", priority: 1, keywords: [] },  // default
  ],

  // ── ADD_EXPENSE ──────────────────────────────────────────────────────────
  ADD_EXPENSE: [
    {
      subIntent: "REIMBURSABLE",
      priority: 20,
      keywords: ["claim", "reimburse", "reimbursement", "expense claim",
                 "will get back", "get refunded", "for work", "office expense",
                 "company will pay", "company paid"],
    },
    {
      subIntent: "SPLIT",
      priority: 15,
      keywords: ["split", "divide", "shared", "between us", "half", "each person",
                 "dutch", "splitting with", "share the bill", "going halves"],
    },
    { subIntent: "LOG", priority: 1, keywords: [] },
  ],

  // ── INCOME_DECLARATION ───────────────────────────────────────────────────
  INCOME_DECLARATION: [
    {
      subIntent: "MULTIPLE_SOURCES",
      priority: 30,
      keywords: ["plus", "also", "along with", "in addition", "on top of",
                 "side income", "extra income", "secondary income", "also earn",
                 "plus i get", "and also"],
      slotCheck: (s) => !!s.secondaryAmount || !!s.secondarySource,
    },
    {
      subIntent: "VARIABLE",
      priority: 25,
      keywords: ["varies", "between", "around", "roughly", "freelance",
                 "variable", "not fixed", "fluctuates", "sometimes more",
                 "depends on", "anywhere from"],
    },
    {
      subIntent: "ANNUAL",
      priority: 20,
      keywords: ["per year", "annually", "ctc", "a year", "yearly",
                 "annual income", "annual salary", "lpa", "per annum",
                 "cost to company"],
      patterns: [/\b\d+\s*(lpa|l\.p\.a)/i, /per\s+year/i, /a\s+year/i],
    },
    {
      subIntent: "MONTHLY_SALARY",
      priority: 10,
      keywords: ["per month", "monthly", "every month", "take home",
                 "salary is", "my pay is", "i make", "i earn",
                 "per month", "har mahine"],
    },
    { subIntent: "MONTHLY_SALARY", priority: 1, keywords: [] },
  ],

  // ── ADD_ASSET ────────────────────────────────────────────────────────────
  ADD_ASSET: [
    {
      subIntent: "UPDATE_VALUE",
      priority: 10,
      keywords: ["now worth", "current value", "updated to", "revalued",
                 "market value", "valued at now", "price changed", "current price",
                 "current market", "ab tak ki value"],
    },
    { subIntent: "LOG", priority: 1, keywords: [] },
  ],

  // ── ADD_LIABILITY ────────────────────────────────────────────────────────
  ADD_LIABILITY: [
    {
      subIntent: "UPDATE_BALANCE",
      priority: 10,
      keywords: ["outstanding", "balance", "remaining", "still owe",
                 "left on", "pending", "baaki hai", "current balance",
                 "updated balance", "remaining balance"],
    },
    { subIntent: "LOG", priority: 1, keywords: [] },
  ],

  // ── REFUND ───────────────────────────────────────────────────────────────
  REFUND: [
    {
      subIntent: "REVERSAL",
      priority: 25,
      keywords: ["reversal", "reversed", "double debit", "erroneously",
                 "duplicate charge", "wrong debit", "bank reversed",
                 "mistaken debit", "charged twice"],
    },
    {
      subIntent: "CASHBACK",
      priority: 20,
      keywords: ["cashback", "reward", "points credited", "cash reward",
                 "loyalty bonus", "offer credit", "discount credited",
                 "reward points", "credit card reward"],
    },
    { subIntent: "REFUND", priority: 1, keywords: [] },
  ],

  // ── AFFORDABILITY_CHECK ──────────────────────────────────────────────────
  AFFORDABILITY_CHECK: [
    {
      subIntent: "COMPARE",
      priority: 30,
      keywords: ["or", "versus", "vs", "rent vs buy", "alternative",
                 "better to", "should i rent or buy", "compare",
                 "buy vs lease", "new vs second hand"],
    },
    {
      subIntent: "EMI_IMPACT",
      priority: 25,
      keywords: ["emi", "loan", "monthly payment", "instalment", "finance",
                 "on credit", "pay monthly", "kist", "down payment",
                 "equated monthly", "bank loan"],
    },
    {
      subIntent: "FUTURE_PLAN",
      priority: 20,
      keywords: ["next year", "by march", "by june", "by december",
                 "in 6 months", "in 2 years", "planning to buy",
                 "agle saal", "next diwali", "eventually", "someday",
                 "future purchase", "by end of year", "by then",
                 "am i on track", "am i on budget", "am i ready"],
      patterns: [/in \d+ (month|year)/i, /by \w+ \d{4}/i, /planning .* (next|by|in)/i],
    },
    { subIntent: "QUICK", priority: 1, keywords: [] },
  ],

  // ── DEBT_FREEDOM_ANALYSIS ────────────────────────────────────────────────
  DEBT_FREEDOM_ANALYSIS: [
    {
      subIntent: "WHAT_IF",
      priority: 30,
      keywords: ["if i pay extra", "extra payment", "if i add", "suppose",
                 "if i put", "hypothetically", "what if i prepay",
                 "agar extra", "what if", "bonus pe", "lump sum"],
      slotCheck: (s) => !!s.extraPayment,
    },
    {
      subIntent: "STRATEGY",
      priority: 25,
      keywords: ["which loan first", "avalanche", "snowball", "priority",
                 "order", "pehle kaun sa", "which first", "start with",
                 "which debt", "which one to clear"],
    },
    {
      subIntent: "ACCELERATE",
      priority: 20,
      keywords: ["faster", "earlier", "sooner", "accelerate",
                 "quickly", "speed up", "reduce tenure", "prepay",
                 "jaldi", "2 years early", "early payoff"],
    },
    { subIntent: "TIMELINE", priority: 1, keywords: [] },
  ],

  // ── SIP_VS_PREPAY ────────────────────────────────────────────────────────
  SIP_VS_PREPAY: [
    {
      subIntent: "HYBRID",
      priority: 20,
      keywords: ["both", "split between", "some in sip", "partial",
                 "half and half", "divide", "combination", "mix",
                 "thoda sip thoda loan", "partly"],
    },
    {
      subIntent: "BREAKEVEN",
      priority: 15,
      keywords: ["what rate", "breakeven", "at what return", "threshold",
                 "minimum return", "when does investing make sense",
                 "what cagr", "break even"],
    },
    { subIntent: "COMPARE", priority: 1, keywords: [] },
  ],

  // ── LOAN_ANALYSIS ────────────────────────────────────────────────────────
  LOAN_ANALYSIS: [
    {
      subIntent: "REFI_CHECK",
      priority: 30,
      keywords: ["refinance", "re-finance", "switch lender", "lower rate",
                 "better rate", "balance transfer", "move my loan",
                 "repo rate", "should i switch", "transfer loan",
                 "port my loan"],
    },
    {
      subIntent: "EMI_BREAKDOWN",
      priority: 25,
      keywords: ["principal vs interest", "split for month"],
      patterns: [/\d+(st|nd|rd|th)\s*emi/i, /emi\s*number\s*\d+/i, /month\s*\d+\s*emi/i],
      slotCheck: (s) => !!s.emiNumber,
    },
    {
      subIntent: "INTEREST_TOTAL",
      priority: 20,
      keywords: ["total interest", "how much interest", "overall interest",
                 "interest i will pay", "over the entire loan",
                 "by end of tenure", "lifetime interest", "total cost"],
    },
    { subIntent: "AMORTISE", priority: 1, keywords: [] },
  ],

  // ── GOAL_PLANNING ────────────────────────────────────────────────────────
  GOAL_PLANNING: [
    {
      subIntent: "RISK_CHECK",
      priority: 30,
      keywords: ["on track", "will i reach", "will i make it", "am i on track",
                 "at risk", "behind schedule", "am i going to", "kya ho jayega",
                 "miss ho jayega", "am i behind", "pace"],
    },
    {
      subIntent: "PLAN",
      priority: 25,
      keywords: ["how much per month", "monthly saving", "how much should i save",
                 "to reach by", "to hit target", "monthly amount needed",
                 "monthly contribution", "har mahine kitna"],
    },
    {
      subIntent: "CONTRIBUTE",
      priority: 20,
      keywords: ["add to goal", "saved towards", "put into", "contributed",
                 "update goal", "daalo", "top up", "add savings",
                 "adding to", "deposit into goal"],
      slotCheck: (s) => !!s.amount && !!s.goalName,
    },
    {
      subIntent: "TRACK",
      priority: 15,
      keywords: ["how far", "progress", "status", "how much left",
                 "how close", "kitna bacha", "remaining", "check goal",
                 "goal progress", "where am i"],
    },
    { subIntent: "CREATE", priority: 1, keywords: [] },
  ],

  // ── BUDGET_PLANNING ──────────────────────────────────────────────────────
  // This is the most important intent — richest routing rules
  BUDGET_PLANNING: [
    {
      subIntent: "RISK",
      priority: 50,
      keywords: ["at risk", "going to exceed", "will i go over", "overspend",
                 "breach", "cross budget", "warning", "budget khatam hoga",
                 "close to limit", "almost out of budget", "budget warning",
                 "exceed this month", "blow my budget"],
    },
    {
      subIntent: "INSIGHTS",
      priority: 45,
      keywords: ["always exceed", "always over", "trend", "pattern",
                 "every month", "consistently", "habits", "insights",
                 "usually", "typically", "chronic", "history", "analysis",
                 "which budget", "quarter", "last 3 months"],
    },
    {
      subIntent: "RECOMMEND",
      priority: 40,
      keywords: ["help me plan", "suggest", "recommend", "what should my budget be",
                 "how to allocate", "create a plan", "salary ka budget",
                 "50-30-20", "plan for me", "from scratch", "new budget",
                 "build a budget", "set up budgets", "plan a budget",
                 "help me budget", "planning to buy"],  // ← catches "planning to buy a car — help me budget"
      slotCheck: (s) => !!s.salaryAmount,
    },
    {
      subIntent: "CATEGORY_STATUS",
      priority: 35,
      keywords: ["left in", "remaining in", "used up", "how much left",
                 "still have in", "spent from budget", "kitna bacha",
                 "budget for this category", "this category budget"],
      slotCheck: (s) => !!s.category,
    },
    {
      subIntent: "SUMMARY",
      priority: 30,
      keywords: ["budget status", "how am i doing", "overview", "all budgets",
                 "budget summary", "this month budget", "overall", "report",
                 "across all", "all categories", "budget report",
                 "monthly summary", "am i within"],
    },
    {
      subIntent: "CREATE",
      priority: 20,
      keywords: ["set budget", "create budget", "set limit", "cap",
                 "restrict", "allocate", "define budget", "budget banao",
                 "monthly limit", "spending limit", "set a limit",
                 "put a cap", "set ceiling"],
      slotCheck: (s) => !!s.category && !!s.amount,
    },
    { subIntent: "SUMMARY", priority: 1, keywords: [] },
  ],

  // ── SPENDING_ANALYSIS ────────────────────────────────────────────────────
  SPENDING_ANALYSIS: [
    {
      subIntent: "TOP_MERCHANTS",
      priority: 30,
      keywords: ["top", "most", "highest", "biggest", "where i spend most",
                 "largest", "rank", "number one", "top 5", "which apps",
                 "most expensive", "sabse zyada"],
    },
    {
      subIntent: "COMPARE",
      priority: 25,
      keywords: ["compare", "vs", "this vs last", "difference", "change from",
                 "more or less than", "comparison", "versus",
                 "this month vs", "same period last", "year over year"],
      slotCheck: (s) => !!s.compareWithPeriod,
    },
    {
      subIntent: "TREND",
      priority: 20,
      keywords: ["trend", "over months", "changing", "going up", "increasing",
                 "over time", "history", "past 3 months", "year to date",
                 "month on month", "how it changed"],
    },
    {
      subIntent: "CATEGORY_DRILL",
      priority: 15,
      keywords: ["show all", "list transactions", "details for", "drill into",
                 "specific merchant", "all zomato", "all fuel", "filter by",
                 "every purchase", "all expenses at", "transactions from"],
      slotCheck: (s) => !!s.merchant || !!s.category,
    },
    { subIntent: "BREAKDOWN", priority: 1, keywords: [] },
  ],

  // ── NET_WORTH_CHECK ──────────────────────────────────────────────────────
  NET_WORTH_CHECK: [
    {
      subIntent: "WHAT_IF",
      priority: 30,
      keywords: ["if i buy", "if i sell", "impact", "what would happen",
                 "effect on net worth", "if i take a loan", "hypothetically",
                 "agar", "if i invest", "what if"],
    },
    {
      subIntent: "TREND",
      priority: 25,
      keywords: ["trend", "growing", "over time", "how it changed",
                 "progress", "year", "month by month", "history",
                 "improving", "net worth journey"],
    },
    {
      subIntent: "BREAKDOWN",
      priority: 20,
      keywords: ["breakdown", "list assets", "show debts", "assets and liabilities",
                 "what i own", "what i owe", "detail", "separately",
                 "individual", "component"],
    },
    { subIntent: "TOTAL", priority: 1, keywords: [] },
  ],

  // ── CASHFLOW_WARNING ─────────────────────────────────────────────────────
  CASHFLOW_WARNING: [
    {
      subIntent: "PROJECTION",
      priority: 30,
      keywords: ["project", "forecast", "will i run out", "end of month",
                 "at this rate", "by month end", "estimate",
                 "by the 30th", "rest of month"],
    },
    {
      subIntent: "UPCOMING",
      priority: 25,
      keywords: ["can i cover", "emi", "rent due", "commitment", "bills",
                 "subscription", "due this month", "will i have enough",
                 "upcoming payments", "fixed costs", "ho jayegi kya"],
    },
    {
      subIntent: "ALERT",
      priority: 20,
      keywords: ["[system]", "auto alert", "system alert"],  // system-generated
    },
    { subIntent: "CHECK", priority: 1, keywords: [] },
  ],

  // ── SAVINGS_ADVICE ───────────────────────────────────────────────────────
  SAVINGS_ADVICE: [
    {
      subIntent: "AUTOMATE",
      priority: 30,
      keywords: ["automate", "auto", "auto-debit", "standing order",
                 "automatic", "set and forget", "auto transfer",
                 "auto save", "sip", "recurring transfer", "auto invest"],
    },
    {
      subIntent: "OPTIMISE",
      priority: 25,
      keywords: ["save faster", "reach goal", "hit target", "optimise for",
                 "accelerate savings", "goal ke liye", "jaldi bachaon",
                 "faster for", "to hit my goal"],
      slotCheck: (s) => !!s.goalName,
    },
    {
      subIntent: "PLAN",
      priority: 20,
      keywords: ["savings plan", "create a plan", "how should i save",
                 "monthly plan", "budget and save", "plan banao",
                 "blueprint", "savings structure", "allocation"],
      slotCheck: (s) => !!s.salaryAmount,
    },
    {
      subIntent: "CATEGORY",
      priority: 15,
      keywords: ["reduce", "cut down", "spend less on", "save on",
                 "lower my", "trim", "how to cut", "too much on",
                 "specific category", "food delivery", "dining", "fuel"],
      slotCheck: (s) => !!s.category,
    },
    { subIntent: "GENERAL", priority: 1, keywords: [] },
  ],

  // ── UNKNOWN ──────────────────────────────────────────────────────────────
  UNKNOWN: [],
};

// ─── ROUTER IMPLEMENTATION ────────────────────────────────────────────────────

export class SubIntentRouter {

  /**
   * Primary entry point. Call after your NLP model has predicted the intent.
   *
   * @param intent       Top-level intent from NLP model
   * @param utterance    Raw user utterance (lowercase-normalised internally)
   * @param modelOutput  Full model output (optional sub_intent prediction from model)
   */
  static route(
    intent: Intent,
    utterance: string,
    modelOutput?: Partial<ModelOutput>
  ): RoutingResult {

    // ── Tier 1: Trust model if it predicted sub_intent with high confidence ──
    if (
      modelOutput?.subIntent &&
      modelOutput?.subIntentConf !== undefined &&
      modelOutput.subIntentConf >= 0.75
    ) {
      return {
        intent,
        subIntent:  modelOutput.subIntent,
        confidence: modelOutput.subIntentConf,
        source:     "model",
        signals:    ["model_prediction"],
      };
    }

    const lower = utterance.toLowerCase();
    const slots = modelOutput?.slots || {};
    const rules = ROUTING_RULES[intent] || [];

    // Sort rules by priority descending — highest wins
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);

    // ── Tier 2: Rule-based keyword + pattern matching ─────────────────────
    for (const rule of sorted) {
      if (rule.priority === 1) continue;  // skip default, check last

      const signals: string[] = [];

      // Keyword matching
      if (rule.keywords?.length) {
        const matched = rule.keywords.filter(kw => lower.includes(kw));
        if (matched.length > 0) signals.push(...matched);
      }

      // Regex pattern matching
      if (rule.patterns?.length) {
        for (const pat of rule.patterns) {
          if (pat.test(lower)) signals.push(pat.source);
        }
      }

      // Slot presence check
      const slotPass = rule.slotCheck ? rule.slotCheck(slots) : true;

      if (signals.length > 0 && slotPass) {
        return {
          intent,
          subIntent:  rule.subIntent,
          confidence: 0.80 + Math.min(0.15, signals.length * 0.05),
          source:     "rule",
          signals,
        };
      }
    }

    // ── Tier 3: Slot-presence heuristics (no keyword match needed) ───────
    const heuristicResult = this.slotHeuristic(intent, slots);
    if (heuristicResult) {
      return {
        intent,
        subIntent:  heuristicResult.subIntent,
        confidence: 0.65,
        source:     "heuristic",
        signals:    heuristicResult.signals,
      };
    }

    // ── Tier 4: Intent-level default ──────────────────────────────────────
    const defaultRule = sorted.find(r => r.priority === 1);
    const defaultSubIntent = defaultRule?.subIntent ?? "GENERAL";

    return {
      intent,
      subIntent:  defaultSubIntent,
      confidence: 0.50,
      source:     "default",
      signals:    ["[default_fallback]"],
    };
  }

  /**
   * Slot-presence heuristics — infer sub-intent from what slots were extracted
   * even when no keywords matched.
   */
  private static slotHeuristic(
    intent: Intent,
    slots: Record<string, string>
  ): { subIntent: string; signals: string[] } | null {

    switch (intent) {

      case "INCOME_DECLARATION":
        if (slots.secondaryAmount || slots.secondarySource)
          return { subIntent: "MULTIPLE_SOURCES", signals: ["slot:secondaryAmount"] };
        if (slots.frequency?.includes("year") || slots.frequency?.includes("annual"))
          return { subIntent: "ANNUAL", signals: ["slot:frequency=annual"] };
        break;

      case "GOAL_PLANNING":
        // Has amount + goal but no targetDate → CONTRIBUTE
        if (slots.amount && slots.goalName && !slots.targetDate)
          return { subIntent: "CONTRIBUTE", signals: ["slot:amount+goalName"] };
        // Has targetDate → CREATE or PLAN
        if (slots.targetDate && slots.amount)
          return { subIntent: "CREATE", signals: ["slot:targetDate+amount"] };
        break;

      case "BUDGET_PLANNING":
        // Has category + amount → CREATE
        if (slots.category && slots.amount)
          return { subIntent: "CREATE", signals: ["slot:category+amount"] };
        // Has only category → CATEGORY_STATUS
        if (slots.category && !slots.amount)
          return { subIntent: "CATEGORY_STATUS", signals: ["slot:category"] };
        // Has salary → RECOMMEND
        if (slots.salaryAmount)
          return { subIntent: "RECOMMEND", signals: ["slot:salaryAmount"] };
        break;

      case "AFFORDABILITY_CHECK":
        // Has targetDate → FUTURE_PLAN
        if (slots.targetDate)
          return { subIntent: "FUTURE_PLAN", signals: ["slot:targetDate"] };
        // Has loanTenure or downPayment → EMI_IMPACT
        if (slots.loanTenure || slots.downPayment)
          return { subIntent: "EMI_IMPACT", signals: ["slot:loanTenure"] };
        break;

      case "LOAN_ANALYSIS":
        if (slots.emiNumber)
          return { subIntent: "EMI_BREAKDOWN", signals: ["slot:emiNumber"] };
        if (slots.newRate)
          return { subIntent: "REFI_CHECK", signals: ["slot:newRate"] };
        break;

      case "SPENDING_ANALYSIS":
        if (slots.merchant || (slots.category && slots.period))
          return { subIntent: "CATEGORY_DRILL", signals: ["slot:merchant/category"] };
        if (slots.compareWithPeriod)
          return { subIntent: "COMPARE", signals: ["slot:compareWithPeriod"] };
        break;

      case "NET_WORTH_CHECK":
        if (slots.itemName || (slots.amount && !slots.period))
          return { subIntent: "WHAT_IF", signals: ["slot:itemName/amount"] };
        break;
    }

    return null;
  }

  /**
   * Batch routing — useful for dataset labelling
   */
  static routeBatch(
    records: Array<{ intent: Intent; utterance: string; slots?: Record<string, string> }>
  ): RoutingResult[] {
    return records.map(r =>
      this.route(r.intent, r.utterance, { slots: r.slots || {} })
    );
  }

  /**
   * Explain routing decision for debugging / logging
   */
  static explain(
    intent: Intent,
    utterance: string,
    modelOutput?: Partial<ModelOutput>
  ): string {
    const result = this.route(intent, utterance, modelOutput);
    const lines = [
      `Intent    : ${result.intent}`,
      `Sub-Intent: ${result.subIntent}`,
      `Source    : ${result.source.toUpperCase()}`,
      `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
      `Signals   : ${result.signals.join(", ")}`,
      `Utterance : "${utterance}"`,
    ];
    return lines.join("\n");
  }
}

// ─── EXAMPLES ─────────────────────────────────────────────────────────────────
//
//  SubIntentRouter.explain("BUDGET_PLANNING",
//    "I'm planning to buy a car next year — help me build a budget for it");
//
//  Output:
//    Intent    : BUDGET_PLANNING
//    Sub-Intent: RECOMMEND
//    Source    : RULE
//    Confidence: 85%
//    Signals   : planning to buy
//    Utterance : "I'm planning to buy a car next year — help me build a budget for it"
//
// ─────────────────────────────────────────────────────────────────────────────
//
//  SubIntentRouter.explain("AFFORDABILITY_CHECK",
//    "I'm planning to buy a car next year, am I on budget for it?");
//
//  Output:
//    Intent    : AFFORDABILITY_CHECK
//    Sub-Intent: FUTURE_PLAN
//    Source    : RULE
//    Confidence: 85%
//    Signals   : next year, planning to buy, am i on budget
//    Utterance : "I'm planning to buy a car next year, am I on budget for it?"
