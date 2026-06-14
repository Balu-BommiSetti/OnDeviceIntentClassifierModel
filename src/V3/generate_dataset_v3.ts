// ═══════════════════════════════════════════════════════════════════════════════
//  WealthPilot — Dataset Generator  v2.0.0
//  Generates training samples WITH sub_intent field
//  Builds on top of the existing generate_dataset.ts infrastructure
//
//  KEY ADDITIONS:
//  1. Every sample carries { intent, subIntent } — dual-label classification
//  2. Sub-intent routing is applied at label-generation time
//  3. Rich natural-language sentence templates per sub-intent
//  4. Hinglish, long narrative, future-planning, and conversational styles
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs";
import { routeSubIntent, INTENT_TAXONOMY, TAXONOMY_METADATA, Intent, SubIntent } from "./intent_taxonomy";

// ─── RE-USE ALL VOCABULARY FROM original generate_dataset.ts ─────────────────
// (Paste or import VERBS_SPEND, VERBS_INCOME, REGIONAL_DATA, AMOUNTS, etc.
//  from generate_dataset.ts. Below we add the NEW sub-intent template banks.)

type Region = "US" | "UK" | "UAE" | "IN" | "AU" | "CA";

type StyleCategory =
  | "direct" | "conversational" | "professional" | "banking"
  | "informal" | "voice_to_text" | "long_narrative" | "short_fragment"
  | "typo" | "grammar_mistake" | "abbreviation" | "currency_variation"
  | "regional_vocab" | "ambiguous" | "adversarial";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── AMOUNTS BY REGION ────────────────────────────────────────────────────────

const AMOUNTS_BY_REGION: Record<Region, string[]> = {
  IN:  ["₹500", "₹1200", "₹5000", "₹15000", "₹50000", "1.5 lakhs", "2L", "50k", "₹75000", "10 hazar", "das hazaar", "pacchees hazaar", "1 crore", "₹999", "₹349"],
  US:  ["$45", "$120", "$1500", "$250", "fifty bucks", "$9.99", "$75", "$3000", "two hundred bucks", "a grand", "$5000"],
  UK:  ["£30", "£85", "£1200", "fifty quid", "a tenner", "£9.99", "£250", "two hundred quid", "£375", "five hundred pounds"],
  UAE: ["AED 200", "AED 5000", "165 dirhams", "AED 1500", "500 dirhams", "AED 50", "AED 10000", "fifty dirhams", "AED 750"],
  AU:  ["$45", "AUD 120", "$1500", "AUD 250", "fifty bucks", "$9.99", "AUD 75", "$3000", "couple hundred", "a grand"],
  CA:  ["$45", "CAD 120", "$1500", "C$250", "fifty bucks", "$9.99", "CAD 75", "$3000", "couple hundred"],
};

const GOAL_NAMES = [
  "Europe trip", "emergency fund", "house down payment", "car purchase",
  "wedding fund", "retirement corpus", "foreign trip", "new phone fund",
  "laptop fund", "education fund", "Goa trip", "bike purchase",
  "home renovation", "child education fund", "business fund",
];

const ITEMS = [
  "iPhone", "MacBook", "car", "bike", "laptop", "iPad", "4K TV",
  "camera", "PlayStation 5", "electric scooter", "AC", "washing machine",
  "flat", "house", "electric bike", "smartwatch", "drone",
];

const CATEGORIES = [
  "groceries", "food delivery", "fuel", "rent", "utilities", "entertainment",
  "dining out", "shopping", "travel", "health", "education", "clothing",
  "electronics", "fitness", "medicines", "subscriptions",
];

const LOAN_TYPES = ["home loan", "car loan", "personal loan", "education loan", "credit card"];

// ─── NATURAL SENTENCE TEMPLATE BANKS PER INTENT + SUB-INTENT ─────────────────
//
//  Each function returns an array of template-generating functions.
//  Templates use {AMOUNT}, {GOAL}, {ITEM}, {CATEGORY}, {LOAN} as placeholders
//  that get resolved at generation time.

interface TemplateResult {
  utterance: string;
  slots: Record<string, string>;
}

// ─── AFFORDABILITY_CHECK — The richest intent, per your example ───────────────

function templates_AFFORDABILITY_QUICK(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const item = pick(ITEMS);
  return [
    () => ({ utterance: `Can I afford a ${item}?`, slots: { itemName: item } }),
    () => ({ utterance: `Should I buy the ${item} for ${amt}?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `Is it safe to spend ${amt} on a ${item}?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `Can I buy a ${item} right now?`, slots: { itemName: item } }),
    () => ({ utterance: `Do I have enough for a ${item}?`, slots: { itemName: item } }),
    () => ({ utterance: `${item} afford kar sakta hoon kya?`, slots: { itemName: item } }),
    () => ({ utterance: `Kya main abhi ${item} khareed sakta hoon?`, slots: { itemName: item } }),
    () => ({ utterance: `Is ${amt} too much to spend on a ${item}?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `Run an affordability check on ${item} for ${amt}`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `Give me a green or red on buying a ${item}`, slots: { itemName: item } }),
    () => ({ utterance: `I'm eyeing a ${item} worth ${amt} — can I swing it?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `Mujhe ${item} lena hai, kya afford hoga?`, slots: { itemName: item } }),
  ];
}

function templates_AFFORDABILITY_FUTURE_PLAN(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const item = pick(ITEMS);
  const timelines = ["next year", "by June", "in 6 months", "by December", "in 2 years", "agle saal", "next Diwali", "by March", "in 18 months"];
  const tl = pick(timelines);
  return [
    () => ({ utterance: `I'm planning to buy a ${item} ${tl} — am I on budget for it?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `Help me figure out if I can realistically buy a ${item} ${tl}`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `I want to buy a ${item} ${tl} costing around ${amt} — should I go for it?`, slots: { itemName: item, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Is now a good time to plan for a ${item} purchase ${tl}?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `Thinking of getting a ${item} ${tl} — can my finances handle it?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `I've been saving for a ${item} — am I on track to buy it ${tl}?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `Before I commit to buying a ${item} ${tl} I want to check my finances`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `Tell me honestly if buying a ${item} ${tl} is a wise decision`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `We are planning to buy a ${item} ${tl} and need to save about ${amt}`, slots: { itemName: item, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Agle saal ${item} lena hai — kya afford hoga?`, slots: { itemName: item, targetDate: "agle saal" } }),
    () => ({ utterance: `${item} lena chahta hoon ${tl} — financially kya sahi rahega?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `If I buy a ${item} ${tl} for ${amt}, will I still meet my savings goals?`, slots: { itemName: item, amount: amt, targetDate: tl } }),
    () => ({ utterance: `How will buying a ${item} ${tl} impact my monthly budget?`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `I plan on purchasing a ${item} ${tl} — help me plan for it financially`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `Check if I'm on track to afford a ${item} by ${tl}`, slots: { itemName: item, targetDate: tl } }),
    () => ({ utterance: `My goal is to own a ${item} ${tl} — is my savings rate sufficient?`, slots: { itemName: item, targetDate: tl } }),
  ];
}

function templates_AFFORDABILITY_EMI_IMPACT(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const item = pick(ITEMS);
  return [
    () => ({ utterance: `If I take a ${item} loan, how much EMI can I afford?`, slots: { itemName: item } }),
    () => ({ utterance: `${item} le loon ${amt} ka toh EMI kitni hogi aur afford hogi kya?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `If I finance a ${item} on 12-month plan, can I manage the monthly payment?`, slots: { itemName: item } }),
    () => ({ utterance: `${item} loan ka asar mere budget pe kya hoga?`, slots: { itemName: item } }),
    () => ({ utterance: `Should I buy the ${item} on EMI — will it fit my budget?`, slots: { itemName: item } }),
    () => ({ utterance: `Kist pe ${item} lena safe hai kya?`, slots: { itemName: item } }),
    () => ({ utterance: `If I take a loan for ${amt} for a ${item}, can I handle the monthly commitment?`, slots: { itemName: item, amount: amt } }),
    () => ({ utterance: `What EMI would I get on ${amt} for a ${item} and is that affordable?`, slots: { itemName: item, amount: amt } }),
  ];
}

function templates_AFFORDABILITY_COMPARE(region: Region): (() => TemplateResult)[] {
  const item = pick(ITEMS);
  return [
    () => ({ utterance: `Should I buy a ${item} or take it on EMI?`, slots: { itemName: item } }),
    () => ({ utterance: `Is it better to rent a flat or buy one?`, slots: { itemName: "flat" } }),
    () => ({ utterance: `Should I buy a car or use Ola/Uber?`, slots: { itemName: "car" } }),
    () => ({ utterance: `Buy vs lease — which is better for me?`, slots: { itemName: item } }),
    () => ({ utterance: `New ${item} vs second-hand — which fits my budget better?`, slots: { itemName: item } }),
    () => ({ utterance: `Is it smarter to upgrade my ${item} now or wait till next year?`, slots: { itemName: item } }),
  ];
}

// ─── BUDGET_PLANNING — Most multi-faceted ─────────────────────────────────────

function templates_BUDGET_CREATE(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const cat = pick(CATEGORIES);
  const freq = pick(["monthly", "weekly", "every month", "per month"]);
  return [
    () => ({ utterance: `Set ${amt} ${freq} budget for ${cat}`, slots: { category: cat, amount: amt, frequency: freq } }),
    () => ({ utterance: `Create a ${cat} limit of ${amt} per month`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `Cap my ${cat} spending at ${amt}`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `I want to limit ${cat} expenses to ${amt} a month`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `${cat} pe ${amt} ka budget set karo`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `Monthly ${cat} limit: ${amt}`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `I've been overspending on ${cat} — set a strict budget of ${amt}`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `Allocate ${amt} for ${cat} this month`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `Set a spending rule: max ${amt} on ${cat} per month`, slots: { category: cat, amount: amt } }),
    () => ({ utterance: `${cat} budget banao ${amt} ka`, slots: { category: cat, amount: amt } }),
  ];
}

function templates_BUDGET_SUMMARY(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Show me my overall budget status this month`, slots: {} }),
    () => ({ utterance: `How am I doing on my budgets?`, slots: {} }),
    () => ({ utterance: `Budget overview for this month please`, slots: {} }),
    () => ({ utterance: `Is mah ka budget summary dikhao`, slots: {} }),
    () => ({ utterance: `Am I within budget this month?`, slots: {} }),
    () => ({ utterance: `All categories budget utilisation`, slots: {} }),
    () => ({ utterance: `Monthly budget check`, slots: {} }),
    () => ({ utterance: `How's my spending compared to my budgets?`, slots: {} }),
    () => ({ utterance: `Budget report card for this month`, slots: {} }),
    () => ({ utterance: `Show budget vs actual for all categories`, slots: {} }),
    () => ({ utterance: `analyze my budget this month`, slots: { period: "this month" } }),
    () => ({ utterance: `Analyze my budget`, slots: {} }),
  ];
}

function templates_BUDGET_CATEGORY_STATUS(region: Region): (() => TemplateResult)[] {
  const cat = pick(CATEGORIES);
  return [
    () => ({ utterance: `How much of my ${cat} budget is left?`, slots: { category: cat } }),
    () => ({ utterance: `${cat} budget kitna bacha hai?`, slots: { category: cat } }),
    () => ({ utterance: `${cat} — how much have I used this month?`, slots: { category: cat } }),
    () => ({ utterance: `Is my ${cat} budget finished?`, slots: { category: cat } }),
    () => ({ utterance: `How much ${cat} budget remaining?`, slots: { category: cat } }),
    () => ({ utterance: `${cat} budget left?`, slots: { category: cat } }),
    () => ({ utterance: `Am I close to hitting my ${cat} limit?`, slots: { category: cat } }),
    () => ({ utterance: `Check my ${cat} spending against budget`, slots: { category: cat } }),
  ];
}

function templates_BUDGET_INSIGHTS(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Which budgets am I always exceeding?`, slots: {} }),
    () => ({ utterance: `Show me budget trends over the past 3 months`, slots: {} }),
    () => ({ utterance: `Which categories do I consistently overspend?`, slots: {} }),
    () => ({ utterance: `Any patterns in my budget performance?`, slots: {} }),
    () => ({ utterance: `Kaunsa budget main hamesha tod deta hoon?`, slots: {} }),
    () => ({ utterance: `Budget insights for the last quarter`, slots: {} }),
    () => ({ utterance: `Where am I chronically over budget?`, slots: {} }),
    () => ({ utterance: `Which of my budgets never work?`, slots: {} }),
    () => ({ utterance: `Show me where I keep failing my budget`, slots: {} }),
    () => ({ utterance: `Budget analysis — successes and failures`, slots: {} }),
  ];
}

function templates_BUDGET_RISK(region: Region): (() => TemplateResult)[] {
  const cat = pick(CATEGORIES);
  return [
    () => ({ utterance: `Am I at risk of going over budget this month?`, slots: {} }),
    () => ({ utterance: `Which budgets might I exceed before month end?`, slots: {} }),
    () => ({ utterance: `${cat} budget khatam hone wala hai kya?`, slots: { category: cat } }),
    () => ({ utterance: `Alert me if I'm close to hitting any limit`, slots: {} }),
    () => ({ utterance: `Will I stay within my ${cat} budget this month?`, slots: { category: cat } }),
    () => ({ utterance: `Any budget breach risk this week?`, slots: {} }),
    () => ({ utterance: `Am I going to blow my budget this month?`, slots: {} }),
    () => ({ utterance: `Which budgets are in the red zone right now?`, slots: {} }),
    () => ({ utterance: `are there any risks with my budget`, slots: {} }),
  ];
}

function templates_BUDGET_RECOMMEND(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const item = pick(ITEMS);
  const goal = pick(GOAL_NAMES);
  return [
    () => ({ utterance: `Help me create a budget plan for my ${amt} salary`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `Suggest how I should allocate my ${amt} take-home`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `${amt} salary hai — budget kaise banaaon?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `What should my budget categories look like on ${amt}/month?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `Recommend a budget plan for me`, slots: {} }),
    () => ({ utterance: `Apply 50-30-20 rule to my income of ${amt}`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `I'm planning to buy a ${item} next year — help me build a budget that accounts for that`, slots: { itemName: item } }),
    () => ({ utterance: `Create a budget that lets me save for ${goal} while covering monthly expenses`, slots: { goalName: goal } }),
    () => ({ utterance: `What's a realistic budget split for someone earning ${amt}?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `Help me plan my monthly budget from scratch`, slots: {} }),
  ];
}

// ─── GOAL_PLANNING ─────────────────────────────────────────────────────────────

function templates_GOAL_CREATE(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const goal = pick(GOAL_NAMES);
  const tl = pick(["by December", "next year", "in 6 months", "by June", "in 2 years", "agle saal"]);
  return [
    () => ({ utterance: `I want to save ${amt} for ${goal} by ${tl}`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Create ${goal} goal of ${amt}`, slots: { goalName: goal, amount: amt } }),
    () => ({ utterance: `New goal: ${goal}, target ${amt} by ${tl}`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
    () => ({ utterance: `${goal} ke liye goal set karo ${amt} ka`, slots: { goalName: goal, amount: amt } }),
    () => ({ utterance: `Set up a ${goal} fund with target ${amt}`, slots: { goalName: goal, amount: amt } }),
    () => ({ utterance: `I'm dreaming of a ${goal} — help me set a savings goal for it`, slots: { goalName: goal } }),
    () => ({ utterance: `Add goal: ${goal} — ${amt} by ${tl}`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Start tracking my savings for ${goal}`, slots: { goalName: goal } }),
    () => ({ utterance: `${goal} ke liye bachat shuru karna chahta hoon target ${amt}`, slots: { goalName: goal, amount: amt } }),
    () => ({ utterance: `My dream is to have ${amt} saved for ${goal} by ${tl}`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
  ];
}

function templates_GOAL_PLAN(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const goal = pick(GOAL_NAMES);
  const tl = pick(["by December", "next year", "in 6 months", "by June", "in 2 years"]);
  return [
    () => ({ utterance: `How much should I save monthly for my ${goal} by ${tl}?`, slots: { goalName: goal, targetDate: tl } }),
    () => ({ utterance: `To reach ${amt} for ${goal} by ${tl}, how much per month?`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Calculate my monthly contribution needed for ${goal} goal`, slots: { goalName: goal } }),
    () => ({ utterance: `Har mahine kitna banana chahiye ${goal} ke liye?`, slots: { goalName: goal } }),
    () => ({ utterance: `What's the monthly saving needed to hit ${goal} in time?`, slots: { goalName: goal } }),
    () => ({ utterance: `How much per month to save ${amt} for ${goal} by ${tl}?`, slots: { goalName: goal, amount: amt, targetDate: tl } }),
    () => ({ utterance: `Work out a monthly savings plan for my ${goal}`, slots: { goalName: goal } }),
    () => ({ utterance: `${goal} ke liye ${tl} tak, monthly kitna dalun?`, slots: { goalName: goal, targetDate: tl } }),
  ];
}

// ─── DEBT FREEDOM ─────────────────────────────────────────────────────────────

function templates_DEBT_TIMELINE(): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `When will all my loans be cleared?`, slots: {} }),
    () => ({ utterance: `How long will it take to become debt-free?`, slots: {} }),
    () => ({ utterance: `Mera karz kab khatam hoga?`, slots: {} }),
    () => ({ utterance: `Show me my debt freedom date`, slots: {} }),
    () => ({ utterance: `How many more years to pay off everything?`, slots: {} }),
    () => ({ utterance: `Debt-free date calculate karo`, slots: {} }),
    () => ({ utterance: `When will I finish paying off my loans?`, slots: {} }),
    () => ({ utterance: `How long until I'm completely out of debt?`, slots: {} }),
  ];
}

function templates_DEBT_WHAT_IF(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  return [
    () => ({ utterance: `If I pay ${amt} extra each month how much earlier will I be free?`, slots: { extraPayment: amt } }),
    () => ({ utterance: `What if I throw my bonus at the home loan?`, slots: {} }),
    () => ({ utterance: `Agar ${amt} extra doon har mahine toh kitna jaldi hoga?`, slots: { extraPayment: amt } }),
    () => ({ utterance: `Suppose I make a lump sum of ${amt} — how does it affect my timeline?`, slots: { extraPayment: amt } }),
    () => ({ utterance: `If I add ${amt}/month to my loan payoff, what changes?`, slots: { extraPayment: amt } }),
    () => ({ utterance: `Extra ${amt} prepayment — how many months does it save?`, slots: { extraPayment: amt } }),
  ];
}

// ─── SAVINGS_ADVICE ──────────────────────────────────────────────────────────

function templates_SAVINGS_PLAN(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  return [
    () => ({ utterance: `Create a savings plan for my ${amt} salary`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `How should I split my ${amt} take-home between spending and saving?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `${amt} mein se kitna bachana chahiye aur kaise?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `Build me a monthly savings blueprint for ${amt} income`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `Suggest a savings structure for ${amt}/month take-home`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `I earn ${amt} — how much should I save?`, slots: { salaryAmount: amt } }),
    () => ({ utterance: `What's a healthy savings rate for someone making ${amt}?`, slots: { salaryAmount: amt } }),
  ];
}

function templates_SAVINGS_CATEGORY(region: Region): (() => TemplateResult)[] {
  const cat = pick(CATEGORIES);
  return [
    () => ({ utterance: `How do I reduce my ${cat} spend?`, slots: { category: cat } }),
    () => ({ utterance: `Tips to cut down on ${cat}`, slots: { category: cat } }),
    () => ({ utterance: `I spend too much on ${cat} — what can I do?`, slots: { category: cat } }),
    () => ({ utterance: `${cat} pe kharcha kam karna hai`, slots: { category: cat } }),
    () => ({ utterance: `How to spend less on ${cat}?`, slots: { category: cat } }),
    () => ({ utterance: `Ways to reduce my ${cat} budget`, slots: { category: cat } }),
    () => ({ utterance: `${cat} expenses are out of control, help me cut them`, slots: { category: cat } }),
  ];
}

// ─── LOAN ANALYSIS ──────────────────────────────────────────────────────────

function templates_LOAN_AMORTISE(region: Region): (() => TemplateResult)[] {
  const lt = pick(LOAN_TYPES);
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const rate = pick(["8.5%", "9%", "12%", "14%", "6.5%", "10%"]);
  const tenure = pick(["10 years", "20 years", "5 years", "3 years", "15 years"]);
  return [
    () => ({ utterance: `Show me my ${lt} repayment schedule`, slots: { loanType: lt } }),
    () => ({ utterance: `Generate amortisation table for my ${lt}`, slots: { loanType: lt } }),
    () => ({ utterance: `Full EMI breakdown for ${amt} ${lt} at ${rate} for ${tenure}`, slots: { loanType: lt, loanAmount: amt, interestRate: rate } }),
    () => ({ utterance: `Show all monthly payments for my ${lt}`, slots: { loanType: lt } }),
    () => ({ utterance: `${lt} ka poora schedule dikhao`, slots: { loanType: lt } }),
    () => ({ utterance: `How does my ${lt} reduce over time?`, slots: { loanType: lt } }),
  ];
}

function templates_LOAN_INTEREST_TOTAL(region: Region): (() => TemplateResult)[] {
  const lt = pick(LOAN_TYPES);
  return [
    () => ({ utterance: `How much total interest will I pay on my ${lt}?`, slots: { loanType: lt } }),
    () => ({ utterance: `Total interest cost on my ${lt}?`, slots: { loanType: lt } }),
    () => ({ utterance: `How much extra am I paying the bank over the life of my ${lt}?`, slots: { loanType: lt } }),
    () => ({ utterance: `${lt} mein total kitna interest bharunga?`, slots: { loanType: lt } }),
    () => ({ utterance: `Interest vs principal breakdown for my ${lt} over full tenure`, slots: { loanType: lt } }),
  ];
}

// ─── SIP VS PREPAY ──────────────────────────────────────────────────────────

function templates_SIP_COMPARE(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  return [
    () => ({ utterance: `Should I put my bonus into SIP or prepay home loan?`, slots: {} }),
    () => ({ utterance: `Is it better to invest ${amt}/month or reduce EMI?`, slots: { surplusAmount: amt } }),
    () => ({ utterance: `Invest karoon ya loan bhardoon?`, slots: {} }),
    () => ({ utterance: `Compare investing vs prepaying my mortgage`, slots: {} }),
    () => ({ utterance: `SIP vs home loan prepayment — which wins for me?`, slots: {} }),
    () => ({ utterance: `I have ${amt} surplus — SIP or prepay?`, slots: { surplusAmount: amt } }),
    () => ({ utterance: `Should I invest my increment or use it to clear debt faster?`, slots: {} }),
  ];
}

// ─── SPENDING ANALYSIS ──────────────────────────────────────────────────────

function templates_SPENDING_BREAKDOWN(region: Region): (() => TemplateResult)[] {
  const period = pick(["this month", "last month", "this week", "last 3 months", "this year", "last quarter"]);
  return [
    () => ({ utterance: `Show my spending breakdown for ${period}`, slots: { period } }),
    () => ({ utterance: `Where did my money go ${period}?`, slots: { period } }),
    () => ({ utterance: `Spending summary for ${period}`, slots: { period } }),
    () => ({ utterance: `Kahan gaya mera paisa ${period}?`, slots: { period } }),
    () => ({ utterance: `Category-wise expense report ${period}`, slots: { period } }),
    () => ({ utterance: `Total spending breakdown ${period}`, slots: { period } }),
    () => ({ utterance: `Show expenses by category for ${period}`, slots: { period } }),
    () => ({ utterance: `summarize my spendings on food`, slots: { category: "food" } }),
    () => ({ utterance: `can you summarize my spendings on food this month`, slots: { category: "food", period: "this month" } }),
  ];
}

function templates_SPENDING_COMPARE(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `How does this month compare to last month?`, slots: { period: "this month", compareWithPeriod: "last month" } }),
    () => ({ utterance: `Food expenses this month vs last month`, slots: { category: "food", compareWithPeriod: "last month" } }),
    () => ({ utterance: `Compare my spending this quarter vs last quarter`, slots: { compareWithPeriod: "last quarter" } }),
    () => ({ utterance: `Is mahine ka kharcha pichle mahine se zyada hai?`, slots: {} }),
    () => ({ utterance: `Year over year spending comparison`, slots: {} }),
    () => ({ utterance: `This week spending vs last week`, slots: {} }),
  ];
}

// ─── NET WORTH ──────────────────────────────────────────────────────────────

function templates_NET_WORTH_WHAT_IF(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  const item = pick(ITEMS);
  return [
    () => ({ utterance: `If I buy a flat for ${amt}, how does that change my net worth?`, slots: { amount: amt, itemName: "flat" } }),
    () => ({ utterance: `What happens to my net worth if I take a home loan?`, slots: {} }),
    () => ({ utterance: `If I sell my shares worth ${amt}, what's my new net worth?`, slots: { amount: amt } }),
    () => ({ utterance: `Impact of buying a ${item} on my total wealth`, slots: { itemName: item } }),
    () => ({ utterance: `Net worth agar ${amt} ka loan loon toh?`, slots: { amount: amt } }),
    () => ({ utterance: `How would paying off all my debt change my net worth?`, slots: {} }),
  ];
}

// ─── CASHFLOW ──────────────────────────────────────────────────────────────

function templates_CASHFLOW_PROJECTION(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Based on current spending, will I run out this month?`, slots: {} }),
    () => ({ utterance: `Project my cashflow to end of month`, slots: {} }),
    () => ({ utterance: `At this rate, how much will I have left by the 30th?`, slots: {} }),
    () => ({ utterance: `Forecast my balance by end of this month`, slots: {} }),
    () => ({ utterance: `Is mahine ka end mein paisa bacha rahega kya?`, slots: {} }),
    () => ({ utterance: `Will I be in the green or red by month end?`, slots: {} }),
  ];
}

function templates_SPENDING_TREND(region: Region): (() => TemplateResult)[] {
  const cat = pick(CATEGORIES);
  return [
    () => ({ utterance: `How has my ${cat} spending changed over 3 months?`, slots: { category: cat } }),
    () => ({ utterance: `Show spending trend for ${cat} across last 6 months`, slots: { category: cat } }),
    () => ({ utterance: `Is my ${cat} spend going up or down?`, slots: { category: cat } }),
    () => ({ utterance: `Year to date spending trend`, slots: {} }),
    () => ({ utterance: `How has my overall spend changed this year?`, slots: {} }),
  ];
}

function templates_SPENDING_CATEGORY_DRILL(region: Region): (() => TemplateResult)[] {
  const cat = pick(CATEGORIES);
  return [
    () => ({ utterance: `Show all my Zomato transactions last month`, slots: { merchant: "Zomato", period: "last month" } }),
    () => ({ utterance: `All ${cat} expenses this year`, slots: { category: cat, period: "this year" } }),
    () => ({ utterance: `List every ${cat} purchase in February`, slots: { category: cat, period: "February" } }),
    () => ({ utterance: `Swiggy orders is month mein dikhao`, slots: { merchant: "Swiggy" } }),
    () => ({ utterance: `All Netflix charges this year`, slots: { merchant: "Netflix" } }),
  ];
}

function templates_SPENDING_TOP_MERCHANTS(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Which apps am I spending the most on?`, slots: {} }),
    () => ({ utterance: `Top 5 merchants by spend this month`, slots: {} }),
    () => ({ utterance: `Biggest expense categories this quarter`, slots: {} }),
    () => ({ utterance: `Where does most of my money go?`, slots: {} }),
    () => ({ utterance: `Rank my spending categories from highest to lowest`, slots: {} }),
  ];
}

function templates_CASHFLOW_CHECK(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `How much money do I have left to spend this month?`, slots: {} }),
    () => ({ utterance: `Paisa kitna bacha hai?`, slots: {} }),
    () => ({ utterance: `What's my available balance for the rest of the month?`, slots: {} }),
    () => ({ utterance: `After all bills, how much do I have?`, slots: {} }),
    () => ({ utterance: `How much can I still spend?`, slots: {} }),
  ];
}

function templates_CASHFLOW_ALERT(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `[SYSTEM] You have spent 85% of your monthly income with 12 days left`, slots: {} }),
    () => ({ utterance: `[SYSTEM] Cashflow alert: outflows exceeding inflows this week`, slots: {} }),
    () => ({ utterance: `[SYSTEM] You are on track to run out of budget by the 25th`, slots: {} }),
  ];
}

function templates_CASHFLOW_UPCOMING(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Can I cover all my EMIs this month?`, slots: {} }),
    () => ({ utterance: `Will I have enough for rent after my expenses?`, slots: {} }),
    () => ({ utterance: `Kya is mahine EMI cover ho jayegi?`, slots: {} }),
    () => ({ utterance: `Do I have enough to pay all my bills this month?`, slots: {} }),
    () => ({ utterance: `Check if upcoming commitments are covered`, slots: {} }),
  ];
}

function templates_NET_WORTH_TOTAL(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `What's my current net worth?`, slots: {} }),
    () => ({ utterance: `How much am I worth today?`, slots: {} }),
    () => ({ utterance: `Show me my total wealth`, slots: {} }),
    () => ({ utterance: `Meri net worth kya hai?`, slots: {} }),
    () => ({ utterance: `Calculate my financial position`, slots: {} }),
  ];
}

function templates_NET_WORTH_BREAKDOWN(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Show me all my assets and debts separately`, slots: {} }),
    () => ({ utterance: `Break down my net worth — assets vs liabilities`, slots: {} }),
    () => ({ utterance: `What do I own and what do I owe?`, slots: {} }),
    () => ({ utterance: `Meri sampatti aur karz ka breakdown dikhao`, slots: {} }),
    () => ({ utterance: `List all holdings and liabilities`, slots: {} }),
  ];
}

function templates_NET_WORTH_TREND(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `How has my net worth grown this year?`, slots: {} }),
    () => ({ utterance: `Show net worth trend for last 12 months`, slots: {} }),
    () => ({ utterance: `Am I growing my wealth month over month?`, slots: {} }),
    () => ({ utterance: `Net worth progress report`, slots: {} }),
    () => ({ utterance: `Is my financial position improving?`, slots: {} }),
  ];
}

function templates_SIP_BREAKEVEN(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `At what SIP return should I invest instead of prepay?`, slots: {} }),
    () => ({ utterance: `My loan is at 9% — what return do I need to justify not prepaying?`, slots: {} }),
    () => ({ utterance: `What's the breakeven return rate between SIP and prepayment?`, slots: {} }),
    () => ({ utterance: `At what mutual fund CAGR does investing beat loan prepayment?`, slots: {} }),
  ];
}

function templates_SIP_HYBRID(region: Region): (() => TemplateResult)[] {
  const amt = pick(AMOUNTS_BY_REGION[region]);
  return [
    () => ({ utterance: `Can I do both — some SIP and some prepayment?`, slots: {} }),
    () => ({ utterance: `Split ${amt} between SIP and home loan — how?`, slots: { surplusAmount: amt } }),
    () => ({ utterance: `Half in mutual funds and half in loan prepayment — good idea?`, slots: {} }),
    () => ({ utterance: `What's the right mix of investing vs prepaying for me?`, slots: {} }),
    () => ({ utterance: `Thoda SIP mein daaloon aur thoda loan mein — kya sahi hai?`, slots: {} }),
  ];
}

function templates_DEBT_ACCELERATE(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `How do I become debt-free 2 years earlier?`, slots: {} }),
    () => ({ utterance: `What can I do to clear my loans faster?`, slots: {} }),
    () => ({ utterance: `I want to pay off home loan 5 years sooner — how?`, slots: {} }),
    () => ({ utterance: `Loan jaldi khatam karna hai, kya karna chahiye?`, slots: {} }),
    () => ({ utterance: `Strategies to accelerate my debt payoff`, slots: {} }),
  ];
}

function templates_DEBT_STRATEGY(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Which loan should I pay off first?`, slots: {} }),
    () => ({ utterance: `Avalanche or snowball — what works for my situation?`, slots: {} }),
    () => ({ utterance: `Should I clear credit card or personal loan first?`, slots: {} }),
    () => ({ utterance: `What order should I pay off my debts?`, slots: {} }),
    () => ({ utterance: `Pehle credit card clear karoon ya personal loan?`, slots: {} }),
  ];
}

function templates_SAVINGS_GENERAL(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `How can I save more money each month?`, slots: {} }),
    () => ({ utterance: `Give me savings tips`, slots: {} }),
    () => ({ utterance: `Help me cut down expenses`, slots: {} }),
    () => ({ utterance: `Paise kaise bachaayen?`, slots: {} }),
    () => ({ utterance: `Ways to save more money`, slots: {} }),
    () => ({ utterance: `I spend too much — help`, slots: {} }),
  ];
}

function templates_SAVINGS_OPTIMISE(region: Region): (() => TemplateResult)[] {
  const goal = pick(GOAL_NAMES);
  return [
    () => ({ utterance: `How do I save faster for my ${goal}?`, slots: { goalName: goal } }),
    () => ({ utterance: `I need to hit my ${goal} by June — how?`, slots: { goalName: goal } }),
    () => ({ utterance: `Optimise my savings to reach ${goal} faster`, slots: { goalName: goal } }),
    () => ({ utterance: `${goal} ke liye jaldi kaise bachaoon?`, slots: { goalName: goal } }),
    () => ({ utterance: `What should I cut to hit my ${goal} sooner?`, slots: { goalName: goal } }),
  ];
}

function templates_SAVINGS_AUTOMATE(region: Region): (() => TemplateResult)[] {
  return [
    () => ({ utterance: `Should I set up auto-debit to save each month?`, slots: {} }),
    () => ({ utterance: `How do I automate my savings?`, slots: {} }),
    () => ({ utterance: `Best way to set up automatic savings in India`, slots: {} }),
    () => ({ utterance: `Should I start an SIP for my savings goal?`, slots: {} }),
    () => ({ utterance: `Standing order to savings account — good idea?`, slots: {} }),
    () => ({ utterance: `Auto-save karna chahta hoon — kaise karoon?`, slots: {} }),
  ];
}


// DYNAMIC EXPANSION FOR UNDERREPRESENTED INTENTS
const EXTRA_PERIODS = ["this month", "last month", "this week", "last 3 months", "this year", "last quarter", "today", "yesterday", "in January", "over the weekend", "last year", "since January", "in Q1"];
const EXTRA_MERCHANTS = ["Amazon", "Uber", "Swiggy", "Zomato", "Netflix", "Flipkart", "Tesco", "Nike", "Starbucks", "Ola", "Myntra", "Apple", "Spotify"];
const HINGLISH_FILLERS = ["bhai", "yaar", "pls", "please", "batao", "dikhao", "check karo"];

function generateCombinations(baseUtterances, slotKey, slotValues) {
  const res = [];
  for (const u of baseUtterances) {
    if (u.includes("{" + slotKey + "}")) {
      for (const v of slotValues) {
        res.push(() => ({ utterance: u.replace("{" + slotKey + "}", v), slots: { [slotKey]: v } }));
      }
    } else {
      res.push(() => ({ utterance: u, slots: {} }));
    }
  }
  return res;
}

function expandTemplates(templatesStrArr, slotsObj) {
   let current = templatesStrArr.map(u => () => {
      // extract placeholders
      let uText = u;
      let s = {};
      for (const [k, vals] of Object.entries(slotsObj)) {
         if (uText.includes("{" + k + "}")) {
            const val = vals[Math.floor(Math.random() * vals.length)];
            uText = uText.replace("{" + k + "}", val);
            s[k] = val;
         }
      }
      // Add random hinglish/style
      if (Math.random() > 0.8) uText += " " + HINGLISH_FILLERS[Math.floor(Math.random() * HINGLISH_FILLERS.length)];
      if (Math.random() > 0.8) uText = uText.toLowerCase();
      return { utterance: uText, slots: s };
   });
   
   // generate 100 random variations from the pool
   const result = [];
   for(let i=0; i<3000; i++) {
     const t = current[Math.floor(Math.random() * current.length)];
     result.push(t);
   }
   return result;
}

// Override functions to return huge arrays
templates_SPENDING_BREAKDOWN = function(region) {
  const raw = [
    "summarize my spendings on {category}",
    "can you summarize my spendings on {category} {period}",
    "Show my spending breakdown for {period}",
    "Where did my money go {period}?",
    "Spending summary for {period}",
    "Kahan gaya mera paisa {period}?",
    "Category-wise expense report {period}",
    "Total spending breakdown {period}",
    "Show expenses by category for {period}",
    "How much did I spend on {category} {period}?",
    "What is my total spend on {category}?",
    "I want to see my {category} expenses",
    "{category} ka kharcha dikhao {period}",
    "Give me a breakdown of {category}",
    "How much money went to {category} {period}",
    "Did I spend a lot on {category} {period}?"
  ];
  return expandTemplates(raw, { period: EXTRA_PERIODS, category: CATEGORIES });
};

templates_CASHFLOW_ALERT = function(region) {
  const raw = [
    "[SYSTEM] You have spent 85% of your monthly income with 12 days left",
    "[SYSTEM] Cashflow alert: outflows exceeding inflows this week",
    "[SYSTEM] You are on track to run out of budget by the 25th",
    "Warning: Balance is running low for {period}",
    "Alert: High burn rate detected",
    "Danger: You might run out of cash {period}",
    "Watch out, your spending is too high this month",
    "System message: Account balance critically low"
  ];
  return expandTemplates(raw, { period: EXTRA_PERIODS });
};

templates_CASHFLOW_CHECK = function(region) {
  const raw = [
    "How much money do I have left to spend {period}?",
    "Paisa kitna bacha hai?",
    "What's my available balance for the rest of the month?",
    "After all bills, how much do I have?",
    "How much can I still spend?",
    "Balance check karo",
    "Are we broke yet?",
    "Do I have enough money left?",
    "Cash bacha hai kya?"
  ];
  return expandTemplates(raw, { period: EXTRA_PERIODS });
};

templates_NET_WORTH_TOTAL = function(region) {
  const raw = [
    "What's my current net worth?",
    "How much am I worth today?",
    "Show me my total wealth",
    "Meri net worth kya hai?",
    "Calculate my financial position",
    "Am I rich yet?",
    "Total assets minus liabilities",
    "What is my overall wealth?",
    "Net worth number batao"
  ];
  return expandTemplates(raw, {});
};

templates_SIP_COMPARE = function(region) {
  const raw = [
    "Should I put my bonus into SIP or prepay home loan?",
    "Is it better to invest {amount}/month or reduce EMI?",
    "Invest karoon ya loan bhardoon?",
    "Compare investing vs prepaying my mortgage",
    "SIP vs home loan prepayment — which wins for me?",
    "I have {amount} surplus — SIP or prepay?",
    "Should I invest my increment or use it to clear debt faster?",
    "Prepay loan or do SIP with {amount}?",
    "What makes more sense: investing {amount} or paying off debt?"
  ];
  return expandTemplates(raw, { amount: AMOUNTS_BY_REGION[region] || AMOUNTS_BY_REGION["IN"] });
};

templates_DEBT_TIMELINE = function() {
  const raw = [
    "When will all my loans be cleared?",
    "How long will it take to become debt-free?",
    "Mera karz kab khatam hoga?",
    "Show me my debt freedom date",
    "How many more years to pay off everything?",
    "Debt-free date calculate karo",
    "When will I finish paying off my loans?",
    "How long until I'm completely out of debt?",
    "When am I going to be free of all this debt?",
    "Karz se kab mukti milegi?"
  ];
  return expandTemplates(raw, {});
};

templates_SAVINGS_GENERAL = function(region) {
  const raw = [
    "How can I save more money each month?",
    "Give me savings tips",
    "Help me cut down expenses",
    "Paise kaise bachaayen?",
    "Ways to save more money",
    "I spend too much — help",
    "How do I stop spending so much?",
    "Tips for saving money",
    "I need advice on saving",
    "Bachat kaise karu?"
  ];
  return expandTemplates(raw, {});
};

// Also apply expansion to a few others
templates_SPENDING_TREND = function(region) {
  const raw = [
    "How has my {category} spending changed over 3 months?",
    "Show spending trend for {category} across last 6 months",
    "Is my {category} spend going up or down?",
    "Year to date spending trend",
    "How has my overall spend changed this year?",
    "Trend dikhao {category} ka",
    "Am I spending more on {category} recently?"
  ];
  return expandTemplates(raw, { category: CATEGORIES });
};

templates_BUDGET_SUMMARY = function(region) {
  const raw = [
    "Show me my overall budget status this month",
    "How am I doing on my budgets?",
    "Budget overview for this month please",
    "Is mah ka budget summary dikhao",
    "Am I within budget this month?",
    "All categories budget utilisation",
    "Monthly budget check",
    "How's my spending compared to my budgets?",
    "Budget report card for this month",
    "Show budget vs actual for all categories",
    "analyze my budget this month",
    "Analyze my budget",
    "budget analyze karo"
  ];
  return expandTemplates(raw, { period: EXTRA_PERIODS });
};

templates_BUDGET_RISK = function(region) {
  const raw = [
    "Am I at risk of going over budget this month?",
    "Which budgets might I exceed before month end?",
    "{category} budget khatam hone wala hai kya?",
    "Alert me if I'm close to hitting any limit",
    "Will I stay within my {category} budget this month?",
    "Any budget breach risk this week?",
    "Am I going to blow my budget this month?",
    "Which budgets are in the red zone right now?",
    "are there any risks with my budget",
    "budget risks dikhao",
    "is my {category} budget at risk"
  ];
  return expandTemplates(raw, { category: CATEGORIES });
};

// ─── TEMPLATE DISPATCHER ─────────────────────────────────────────────────────

function getSubIntentTemplates(
  intent: Intent,
  subIntent: string,
  style: StyleCategory,
  region: Region
): (() => TemplateResult)[] {
  switch (`${intent}::${subIntent}`) {
    // AFFORDABILITY_CHECK
    case "AFFORDABILITY_CHECK::QUICK":       return templates_AFFORDABILITY_QUICK(region);
    case "AFFORDABILITY_CHECK::FUTURE_PLAN": return templates_AFFORDABILITY_FUTURE_PLAN(region);
    case "AFFORDABILITY_CHECK::EMI_IMPACT":  return templates_AFFORDABILITY_EMI_IMPACT(region);
    case "AFFORDABILITY_CHECK::COMPARE":     return templates_AFFORDABILITY_COMPARE(region);
    // BUDGET_PLANNING
    case "BUDGET_PLANNING::CREATE":          return templates_BUDGET_CREATE(region);
    case "BUDGET_PLANNING::SUMMARY":         return templates_BUDGET_SUMMARY(region);
    case "BUDGET_PLANNING::CATEGORY_STATUS": return templates_BUDGET_CATEGORY_STATUS(region);
    case "BUDGET_PLANNING::INSIGHTS":        return templates_BUDGET_INSIGHTS(region);
    case "BUDGET_PLANNING::RISK":            return templates_BUDGET_RISK(region);
    case "BUDGET_PLANNING::RECOMMEND":       return templates_BUDGET_RECOMMEND(region);
    // GOAL_PLANNING
    case "GOAL_PLANNING::CREATE":            return templates_GOAL_CREATE(region);
    case "GOAL_PLANNING::PLAN":              return templates_GOAL_PLAN(region);
    // DEBT_FREEDOM_ANALYSIS
    case "DEBT_FREEDOM_ANALYSIS::TIMELINE":  return templates_DEBT_TIMELINE();
    case "DEBT_FREEDOM_ANALYSIS::ACCELERATE":return templates_DEBT_ACCELERATE(region);
    case "DEBT_FREEDOM_ANALYSIS::STRATEGY":  return templates_DEBT_STRATEGY(region);
    case "DEBT_FREEDOM_ANALYSIS::WHAT_IF":   return templates_DEBT_WHAT_IF(region);
    // SAVINGS_ADVICE
    case "SAVINGS_ADVICE::GENERAL":          return templates_SAVINGS_GENERAL(region);
    case "SAVINGS_ADVICE::PLAN":             return templates_SAVINGS_PLAN(region);
    case "SAVINGS_ADVICE::CATEGORY":         return templates_SAVINGS_CATEGORY(region);
    case "SAVINGS_ADVICE::OPTIMISE":         return templates_SAVINGS_OPTIMISE(region);
    case "SAVINGS_ADVICE::AUTOMATE":         return templates_SAVINGS_AUTOMATE(region);
    // LOAN_ANALYSIS
    case "LOAN_ANALYSIS::AMORTISE":          return templates_LOAN_AMORTISE(region);
    case "LOAN_ANALYSIS::INTEREST_TOTAL":    return templates_LOAN_INTEREST_TOTAL(region);
    // SIP_VS_PREPAY
    case "SIP_VS_PREPAY::COMPARE":           return templates_SIP_COMPARE(region);
    case "SIP_VS_PREPAY::BREAKEVEN":         return templates_SIP_BREAKEVEN(region);
    case "SIP_VS_PREPAY::HYBRID":            return templates_SIP_HYBRID(region);
    // SPENDING_ANALYSIS
    case "SPENDING_ANALYSIS::BREAKDOWN":     return templates_SPENDING_BREAKDOWN(region);
    case "SPENDING_ANALYSIS::TREND":         return templates_SPENDING_TREND(region);
    case "SPENDING_ANALYSIS::CATEGORY_DRILL":return templates_SPENDING_CATEGORY_DRILL(region);
    case "SPENDING_ANALYSIS::TOP_MERCHANTS": return templates_SPENDING_TOP_MERCHANTS(region);
    case "SPENDING_ANALYSIS::COMPARE":       return templates_SPENDING_COMPARE(region);
    // NET_WORTH_CHECK
    case "NET_WORTH_CHECK::TOTAL":           return templates_NET_WORTH_TOTAL(region);
    case "NET_WORTH_CHECK::BREAKDOWN":       return templates_NET_WORTH_BREAKDOWN(region);
    case "NET_WORTH_CHECK::TREND":           return templates_NET_WORTH_TREND(region);
    case "NET_WORTH_CHECK::WHAT_IF":         return templates_NET_WORTH_WHAT_IF(region);
    // CASHFLOW_WARNING
    case "CASHFLOW_WARNING::CHECK":          return templates_CASHFLOW_CHECK(region);
    case "CASHFLOW_WARNING::ALERT":          return templates_CASHFLOW_ALERT(region);
    case "CASHFLOW_WARNING::UPCOMING":       return templates_CASHFLOW_UPCOMING(region);
    case "CASHFLOW_WARNING::PROJECTION":     return templates_CASHFLOW_PROJECTION(region);
    default:
      // Fallback: use any available sub-intent templates from the taxonomy
      return [() => ({ utterance: `[${intent}/${subIntent}]`, slots: {} })];
  }
}

// ─── SAMPLE GENERATION LOOP ───────────────────────────────────────────────────

interface ExtendedSample {
  id:                 string;
  intent:             Intent;
  subIntent:          string | null;
  utterance:          string;
  style:              StyleCategory;
  region:             Region;
  split:              "train" | "val" | "test";
  slots_filled:       Record<string, string>;
  routing_signals:    string[];
}

export function generateSubIntentSamples(
  intent: Intent,
  targetPerSubIntent: number = 2000
): ExtendedSample[] {
  const def = INTENT_TAXONOMY.find(i => i.id === intent);
  if (!def) return [];

  const ALL_REGIONS: Region[] = ["US", "UK", "UAE", "IN", "AU", "CA"];
  const ALL_STYLES: StyleCategory[] = [
    "direct", "conversational", "professional", "informal",
    "long_narrative", "short_fragment", "regional_vocab",
    "ambiguous", "voice_to_text", "typo",
  ];

  const results: ExtendedSample[] = [];
  let sampleIdx = 0;
  const seen = new Set<string>();

  for (const subDef of def.subIntents) {
    let count = 0;
    let attempts = 0;
    const maxAttempts = targetPerSubIntent * 30;

    while (count < targetPerSubIntent && attempts < maxAttempts) {
      attempts++;
      const region = pick(ALL_REGIONS);
      const style = pick(ALL_STYLES);

      const templates = getSubIntentTemplates(intent, subDef.code, style, region);
      if (templates.length === 0) continue;

      const { utterance, slots } = pick(templates)();
      if (!utterance || utterance.startsWith("[")) continue;

      const key = utterance.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const { subIntent, signals } = routeSubIntent(intent, utterance);

      const roll = Math.random();
      const split = roll < 0.8 ? "train" : roll < 0.9 ? "val" : "test";

      results.push({
        id: `${intent.slice(0, 3)}_${subDef.code}_${String(sampleIdx++).padStart(5, "0")}`,
        intent,
        subIntent: subDef.code,
        utterance,
        style,
        region,
        split,
        slots_filled: slots,
        routing_signals: signals,
      });
      count++;
    }
  }

  return results;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function generateDatasetV2() {
  const INTENTS: Intent[] = [
    "ADD_INCOME", "ADD_EXPENSE", "INCOME_DECLARATION", "ADD_ASSET",
    "ADD_LIABILITY", "REFUND", "AFFORDABILITY_CHECK", "DEBT_FREEDOM_ANALYSIS",
    "SIP_VS_PREPAY", "LOAN_ANALYSIS", "GOAL_PLANNING", "BUDGET_PLANNING",
    "SPENDING_ANALYSIS", "NET_WORTH_CHECK", "CASHFLOW_WARNING", "SAVINGS_ADVICE",
  ];

  console.log(`\n${"═".repeat(70)}`);
  console.log(`  WealthPilot NLP Dataset Generator v2.0.0`);
  console.log(`  Sub-intent aware — dual-label classification`);
  console.log(`${"═".repeat(70)}\n`);

  const allSamples: ExtendedSample[] = [];

  for (const intent of INTENTS) {
    const def = INTENT_TAXONOMY.find(i => i.id === intent)!;
    process.stdout.write(`  ${intent} (${def.subIntents.length} sub-intents)... `);
    const samples = generateSubIntentSamples(intent, 2000);
    allSamples.push(...samples);
    console.log(`${samples.length} samples ✓`);
  }

  const trainCount = allSamples.filter(s => s.split === "train").length;
  const valCount   = allSamples.filter(s => s.split === "val").length;
  const testCount  = allSamples.filter(s => s.split === "test").length;

  console.log(`\n${"─".repeat(50)}`);
  console.log(`  Total: ${allSamples.length.toLocaleString()} samples`);
  console.log(`  Train: ${trainCount.toLocaleString()} | Val: ${valCount.toLocaleString()} | Test: ${testCount.toLocaleString()}`);
  console.log(`${"─".repeat(50)}\n`);

  const output = {
    metadata: {
      ...TAXONOMY_METADATA,
      totalSamples: allSamples.length,
      subIntentCoverage: true,
      splits: { training: trainCount, validation: valCount, testing: testCount },
    },
    samples: allSamples,
  };

  fs.writeFileSync("./personal_finance_dataset_v2.json", JSON.stringify(output, null, 2));
  console.log(`  ✅ Written: personal_finance_dataset_v2.json`);

  // Sub-intent distribution report
  console.log(`\n  Sub-intent distribution:`);
  const subIntentCounts: Record<string, number> = {};
  for (const s of allSamples) {
    const key = `${s.intent}::${s.subIntent}`;
    subIntentCounts[key] = (subIntentCounts[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(subIntentCounts).sort()) {
    console.log(`    ${key.padEnd(45)} ${count}`);
  }
}

generateDatasetV2();
