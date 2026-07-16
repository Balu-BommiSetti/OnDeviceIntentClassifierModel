const fs = require('fs');
const file = '/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/src/V3/generate_dataset_v3.ts';
let code = fs.readFileSync(file, 'utf8');

// I will add a large loop of templates for the 6 underrepresented intents.
// Instead of writing thousands of lines, I can just inject dynamic template generators!

const dynamicTemplates = `
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
`;

// Insert the dynamic templates right before `// ─── TEMPLATE DISPATCHER`
code = code.replace('// ─── TEMPLATE DISPATCHER', dynamicTemplates + '\n// ─── TEMPLATE DISPATCHER');
fs.writeFileSync(file, code);
console.log("Patched successfully.");
