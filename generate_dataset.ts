import fs from "fs";

// List of 16 supported intents
const INTENTS = [
  "ADD_EXPENSE",
  "ADD_INCOME",
  "ADD_COMMITMENT",
  "ADD_GOAL",
  "UPDATE_GOAL_PROGRESS",
  "CREATE_BUDGET",
  "VIEW_SPENDING_ANALYSIS",
  "VIEW_CASHFLOW",
  "VIEW_NET_WORTH",
  "ADD_ASSET",
  "ADD_LIABILITY",
  "AFFORDABILITY_CHECK",
  "SAVINGS_ADVICE",
  "FINANCIAL_HEALTH_CHECK",
  "VIEW_DASHBOARD",
  "UNKNOWN"
];

// Rich Vocabulary Pools for Synthesizing Multi-class Intents
const VERBS_SPEND = [
  "spent", "paid", "given", "dropped", "swiped", "charged", "settled", 
  "shelled out", "wasted", "invested", "transferred out", "disbursed", 
  "blew", "forked over", "put down", "cleared", "handed over", "parted with", 
  "expended", "splurged", "liquidated", "cashed out for", "remitted", 
  "forfeited", "lost", "sacrificed", "allocated to", "spent down"
];

const VERBS_INCOME = [
  "received", "got", "earned", "credited", "deposited", "pulled in", "bagged",
  "obtained", "gained", "withdrew", "pocketed", "secured", "cashed", "cleared",
  "collected", "netted", "made", "took in", "accrued"
];

const VERBS_LIMIT = [
  "set", "limit", "cap", "restrict", "budget", "establish", "allocate", "lock in",
  "place", "configure", "assign", "determine", "fix"
];

const CURRENCY_SYMBOLS = ["$", "USD", "INR", "euros", "bucks", "pounds", "dollars", "rupees", "grand", "yen", "rs", "₹"];

const AMOUNTS = [
  "15", "45.50", "90", "1200", "5", "10.25", "250", "3000", "20", "50", 
  "100", "500", "10", "9000", "twenty", "fifty", "a hundred", "five hundred", "ten bucks",
  "thirty-five", "eighty", "one thousand", "two thousand", "fifteen", "forty", "seventy-five",
  "8.50", "12.75", "150", "450", "1600", "2100", "65", "19.99", "29.99", "9.99", "12000", "75000", "5000",
  "1.5 lakhs", "2.5 lakhs", "1 cr", "10k", "50k", "100k" // localized South Asian variants
];

const CATEGORIES = [
  "groceries", "food", "coffee", "transportation", "entertainment", "subscriptions",
  "utilities", "gas", "rent", "travel", "dining out", "fitness", "clothing", "education",
  "hobbies", "health", "insurance", "gifts", "charity", "investments", "gadgets", "parking",
  "concert tickets", "dentistry", "car rent", "books", "hardware", "pet care", "fast food",
  "kharcha", "dawa", "bijli bill", "paani block", // Hinglish injections
  "grocereis", "restuarant", "coffe", "utlities" // Typo injections for robustness
];

const MERCHANTS = [
  "Starbucks", "Walmart", "McDonalds", "Uber", "Amazon", "Netflix", "Target", 
  "Costco", "Chevron", "Spotify", "Apple", "Steam", "Whole Foods", "Trader Joes",
  "Sarah", "John", "Mom", "Dad", "uncles co", "landlord", "electric company",
  "gas station", "grocery store", "movie theater", "gym", "bookstore", "cafe",
  "bistro", "pharmacy", "dentist", "barber", "dry cleaners", "Ikea", "Best buy",
  "Nordstrom", "Nike", "Adidas", "Patagonia", "steam store", "playstation network",
  "nintendo eshop", "epic games", "doordash", "grubhub", "ubereats", "airbnb",
  "delta airlines", "hertz", "shell", "exxon"
];

const PAYMENT_METHODS = [
  "credit card", "cash", "debit card", "PayPal", "Apple Pay", "savings account", 
  "bank transfer", "Venmo", "UPI", "GPay", "credit line", "crypto wallet"
];

const TIMES = [
  "today", "yesterday", "last night", "this morning", "for June", "this month", 
  "last weekend", "on Monday", "for the week", "on Tuesday", "on Wednesday", 
  "on Thursday", "on Friday", "on Saturday", "on Sunday", "this afternoon", 
  "yesterday afternoon", "yesterday evening", "this past week", "recently", "just now",
  "three days ago", "last month", "for the year", "this morning at 9am", "this evening"
];

const NOTES = [
  "for project X", "with tax included", "weekly splurging", "birthday celebration", 
  "emergency use case", "pre-tax price", "business dinner", "gifts for family", 
  "extra charges incurred", "personal use", "vacation buffer", "for the office"
];

const SOURCES = [
  "salary", "freelance gig", "Google Adsense", "tax refund", "dividend", "investment",
  "consulting job", "Etsy store", "garage sale", "birthday present", "side hustle"
];

const FREQUENCIES = [
  "monthly", "weekly", "annually", "every month", "every week", "yearly", "bi-weekly", 
  "each month", "quarterly"
];

const COMMITMENT_TYPES = [
  "EMI", "loan payment", "PPF contribution", "car loan payment", "mortgage", 
  "insurance premium", "student loan", "gym membership card", "fixed savings deposit"
];

const GOAL_NAMES = [
  "Europe trip", "house savings", "new bike purchase", "emergency fund", "tesla fund", 
  "retirement nest egg", "college fund", "laptop savings", "wedding deposit", "MacBook Pro"
];

const ASSET_TYPES = [
  "gold", "shares", "stocks", "real estate", "land", "crypto", "mutual funds", 
  "vehicle", "precious metals", "silver", "artwork"
];

const ASSET_NAMES = [
  "Reliance shares", "Apple stock", "Bitcoin", "Tesla stock", "Ethereum", "S&P 500 ETF", 
  "holiday cabin", "Toyota Camry", "Tesla Model 3", "gold bars"
];

const LIABILITY_TYPES = [
  "personal loan", "credit card debt", "student loan debt", "mortgage loan", 
  "home equity loan", "payday loan", "bank overdraft"
];

const INTEREST_RATES = [
  "5%", "7.5%", "12% APR", "8% interest rate", "10% per annum", "6.2% fixed", "15% interest"
];

const ITEM_NAMES = [
  "iPhone 15", "MacBook Pro", "designer bag", "acoustic guitar", "Rolex watch", 
  "ergonomic chair", "Peloton bike", "Nike sneakers", "electric scooter", "4K TV"
];

const FILLERS = [
  "Could you please", "Please", "Can you", "I need to", "I want to", "Kindly", "Would you mind to",
  "Go ahead and", "Instantly", "Can I check", "Please help me to", "Just", "Simply", "I am looking to",
  "Wondering if you can", "Let's go ahead and", "My system asks to", "Would be great if we could",
  "Is it possible to", "I'd like you to help me", "If you can please", "Do me a favor and", "I really need to",
  "Could you assist me to", "Am tasking you to", "Hey, please", "Quickly", "Could you go ahead and", "I'd appreciate if you"
];

const ENDERS = [
  "immediately", "right now", "with immediate effect", "now", "on my screen", "direct", 
  "if possible", "when you can", "at your earliest convenience", "for my records", "as a summary",
  "for my sanity check", "without delay", "promptly", "in detail", "as soon as you can", "straight away",
  "this instant", "for review", "permanently"
];

// Unknown lists
const UNKNOWN_VERBS = [
  "tell", "explain to", "teach", "inform", "educate", "brief", "fill", "update", "talk to", "guide",
  "lecture", "instruct", "show", "describe to", "give some info on"
];

const UNKNOWN_TOPICS = [
  "quantum physics", "world history", "cooking tips", "gardening hacks", "dog training", "cat breeds",
  "space exploration", "renewable energy", "ancient Egypt", "Renaissance art", "machine learning",
  "organic chemistry", "stock market history", "black holes", "deep sea creatures", "volcanoes",
  "mountaineering", "sustainable design", "music theory", "chess openings", "yoga postures",
  "meditation techniques", "healthy dieting", "urban planning", "photography basics", "origami folding",
  "cryptography", "medieval weapons", "great wall of China", "grand canyon history"
];

const UNKNOWN_SPORTS = [
  "soccer", "football", "basketball", "cricket", "baseball", "tennis", "hockey", "rugby", "chess",
  "Formula 1", "golf", "volleyball", "badminton", "table tennis", "swimming"
];

const UNKNOWN_CITIES = [
  "Rome", "New York", "London", "Tokyo", "Berlin", "Madrid", "Vienna", "Sydney", "Cairo", "Toronto",
  "Mumbai", "Paris", "Dubai", "Singapore", "Cape Town", "Chicago", "San Francisco", "Boston"
];

const UNKNOWN_CODER_TASKS = [
  "reverse lists", "sort arrays", "fetch URLs", "parse JSON", "convert CSV", "generate passwords",
  "scrape HTML tables", "merge PDF files", "calculate primes", "find duplicate values", "implement sorting"
];

// Structural builder to prevent index-of lookup failures and handle duplicate labels
function buildSentence(parts: Array<string | { text: string; label: string }>) {
  let utterance = "";
  const slots_filled: Record<string, string> = {};
  const entities_token_iob: any[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      utterance += part;
    } else {
      const start = utterance.length;
      utterance += part.text;
      const end = utterance.length;

      slots_filled[part.label] = part.text;
      entities_token_iob.push({
        text: part.text,
        label: part.label,
        range: [start, end],
        iob: [`B-${part.label.toUpperCase()}`]
      });
    }
  }

  return { utterance, slots_filled, entities_token_iob };
}

function generateDataset() {
  console.log("Beginning database synthesis of all 16 intents (10,000 unique sequences each = 160,000 records)...");
  
  const dataset: any[] = [];
  const targetCount = 10000;

  for (const intent of INTENTS) {
    const uniqueUtterances = new Set<string>();
    let generatedCount = 0;
    let attempts = 0;
    const maxAttempts = targetCount * 130;  // Generous ceiling to find high entropy uniques

    console.log(`Generating intent: [${intent}]`);

    while (generatedCount < targetCount && attempts < maxAttempts) {
      attempts++;

      // Draw variables
      const verbS = VERBS_SPEND[Math.floor(Math.random() * VERBS_SPEND.length)];
      const verbI = VERBS_INCOME[Math.floor(Math.random() * VERBS_INCOME.length)];
      const verbL = VERBS_LIMIT[Math.floor(Math.random() * VERBS_LIMIT.length)];
      
      const amt = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
      const cur = CURRENCY_SYMBOLS[Math.floor(Math.random() * CURRENCY_SYMBOLS.length)];
      const formattedAmount = cur === "$" || cur === "INR" ? `${cur}${amt}` : `${amt} ${cur}`;

      const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
      const payMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
      const date = TIMES[Math.floor(Math.random() * TIMES.length)];
      const notePart = NOTES[Math.floor(Math.random() * NOTES.length)];
      
      const src = SOURCES[Math.floor(Math.random() * SOURCES.length)];
      const freq = FREQUENCIES[Math.floor(Math.random() * FREQUENCIES.length)];
      const commType = COMMITMENT_TYPES[Math.floor(Math.random() * COMMITMENT_TYPES.length)];
      
      const goalNm = GOAL_NAMES[Math.floor(Math.random() * GOAL_NAMES.length)];
      const assetTp = ASSET_TYPES[Math.floor(Math.random() * ASSET_TYPES.length)];
      const assetNm = ASSET_NAMES[Math.floor(Math.random() * ASSET_NAMES.length)];
      const liabilityTp = LIABILITY_TYPES[Math.floor(Math.random() * LIABILITY_TYPES.length)];
      const intRate = INTEREST_RATES[Math.floor(Math.random() * INTEREST_RATES.length)];
      const itemNm = ITEM_NAMES[Math.floor(Math.random() * ITEM_NAMES.length)];
      
      const filler = FILLERS[Math.floor(Math.random() * FILLERS.length)];
      const ender = ENDERS[Math.floor(Math.random() * ENDERS.length)];

      let resultObj: any = null;

      // Intent logic branching with high entropy formulations
      switch (intent) {
        case "ADD_EXPENSE": {
          const templates = [
            () => buildSentence(["I ", { text: verbS, label: "spend_action" }, " ", { text: formattedAmount, label: "amount" }, " on groceries"]),
            () => buildSentence(["I ", { text: verbS, label: "spend_action" }, " ", { text: formattedAmount, label: "amount" }, " for ", { text: cat, label: "category" }, " at ", { text: merchant, label: "merchant" }, " via ", { text: payMethod, label: "paymentMethod" }, " on ", { text: date, label: "date" }]),
            () => buildSentence(["just ", { text: verbS, label: "spend_action" }, " ", { text: payMethod, label: "paymentMethod" }, " for ", { text: formattedAmount, label: "amount" }, " at ", { text: merchant, label: "merchant" }, " (", { text: notePart, label: "notes" }, ")"]),
            () => buildSentence(["ordered ", { text: cat, label: "category" }, " for ", { text: formattedAmount, label: "amount" }, " on ", { text: date, label: "date" }]),
            () => buildSentence(["swiped ", { text: formattedAmount, label: "amount" }, " at ", { text: merchant, label: "merchant" }, " for ", { text: cat, label: "category" }]),
            () => buildSentence(["paid ", { text: formattedAmount, label: "amount" }, " to ", { text: merchant, label: "merchant" }, " for ", { text: cat, label: "category" }, " (", { text: notePart, label: "notes" }, ") on ", { text: date, label: "date" }]),
            () => buildSentence(["dropped ", { text: formattedAmount, label: "amount" }, " for ", { text: cat, label: "category" }, " yesterday"]),
            () => buildSentence(["swiped my ", { text: payMethod, label: "paymentMethod" }, " for ", { text: formattedAmount, label: "amount" }, " yesterday afternoon"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "ADD_INCOME": {
          const templates = [
            () => buildSentence(["salary credited ", { text: formattedAmount, label: "amount" }, " on ", { text: date, label: "date" }]),
            () => buildSentence(["received freelance payment of ", { text: formattedAmount, label: "amount" }, " from ", { text: src, label: "source" }, " on ", { text: date, label: "date" }]),
            () => buildSentence(["got bonus of ", { text: formattedAmount, label: "amount" }, " today, notes: ", { text: notePart, label: "notes" }]),
            () => buildSentence(["cleared contract fee of ", { text: formattedAmount, label: "amount" }, " from ", { text: src, label: "source" }, " (", { text: notePart, label: "notes" }, ")"]),
            () => buildSentence([{ text: verbI, label: "salary_action" }, " a side payment of ", { text: formattedAmount, label: "amount" }, " from ", { text: src, label: "source" }, " on ", { text: date, label: "date" }]),
            () => buildSentence(["I deposited ", { text: formattedAmount, label: "amount" }, " from ", { text: src, label: "source" }, " today"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "ADD_COMMITMENT": {
          const templates = [
            () => buildSentence(["monthly EMI of ", { text: formattedAmount, label: "amount" }]),
            () => buildSentence([{ text: freq, label: "frequency" }, " ", { text: commType, label: "commitmentType" }, " of ", { text: formattedAmount, label: "amount" }, " starting ", { text: date, label: "startDate" }]),
            () => buildSentence(["car loan payment of ", { text: formattedAmount, label: "amount" }, " ", { text: freq, label: "frequency" }]),
            () => buildSentence(["PPF contribution of ", { text: formattedAmount, label: "amount" }, " starting ", { text: date, label: "startDate" }, " ending ", { text: "December 2030", label: "endDate" }]),
            () => buildSentence(["save ", { text: formattedAmount, label: "amount" }, " ", { text: freq, label: "frequency" }, " for ", { text: commType, label: "commitmentType" }]),
            () => buildSentence(["set up ", { text: commType, label: "commitmentType" }, " recurring charge of ", { text: formattedAmount, label: "amount" }, " starting on ", { text: date, label: "startDate" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "ADD_GOAL": {
          const templates = [
            () => buildSentence(["create ", { text: goalNm, label: "goalName" }, " goal"]),
            () => buildSentence(["save ", { text: formattedAmount, label: "targetAmount" }, " for ", { text: goalNm, label: "goalName" }]),
            () => buildSentence(["save ", { text: formattedAmount, label: "targetAmount" }, " for ", { text: goalNm, label: "goalName" }, " by ", { text: "December next year", label: "targetDate" }]),
            () => buildSentence(["new bike purchase goal"]), 
            () => buildSentence(["new ", { text: goalNm, label: "goalName" }, " purchase goal"]),
            () => buildSentence(["configure a new financial target called ", { text: goalNm, label: "goalName" }, " with cap ", { text: formattedAmount, label: "targetAmount" }, " categorized under ", { text: cat, label: "category" }]),
            () => buildSentence(["set goal of ", { text: formattedAmount, label: "targetAmount" }, " for ", { text: goalNm, label: "goalName" }, " targets on ", { text: date, label: "targetDate" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "UPDATE_GOAL_PROGRESS": {
          const templates = [
            () => buildSentence(["add ", { text: formattedAmount, label: "amount" }, " to ", { text: goalNm, label: "goalName" }, " goal"]),
            () => buildSentence(["I saved another ", { text: formattedAmount, label: "amount" }, " for my ", { text: goalNm, label: "goalName" }, " fund"]),
            () => buildSentence(["contribute ", { text: formattedAmount, label: "amount" }, " towards my ", { text: goalNm, label: "goalName" }, " targets"]),
            () => buildSentence(["stash ", { text: formattedAmount, label: "amount" }, " into ", { text: goalNm, label: "goalName" }]),
            () => buildSentence(["transferred ", { text: formattedAmount, label: "amount" }, " over to ", { text: goalNm, label: "goalName" }, " goal page"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "CREATE_BUDGET": {
          const templates = [
            () => buildSentence(["set ", { text: cat, label: "category" }, " budget ", { text: formattedAmount, label: "amount" }]),
            () => buildSentence(["monthly ", { text: cat, label: "category" }, " dining budget ", { text: formattedAmount, label: "amount" }]), 
            () => buildSentence(["monthly dining budget 5000"]), 
            () => buildSentence([{ text: verbL, label: "limit_action" }, " ceiling to ", { text: formattedAmount, label: "amount" }, " on ", { text: cat, label: "category" }]),
            () => buildSentence(["make a budget for ", { text: cat, label: "category" }, " equal to ", { text: formattedAmount, label: "amount" }, " this month"]),
            () => buildSentence(["restrict spending of ", { text: cat, label: "category" }, " limit to ", { text: formattedAmount, label: "amount" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "VIEW_SPENDING_ANALYSIS": {
          const templates = [
            () => buildSentence([filler, " show spending breakdown for ", cat, " on ", date, " ", ender]),
            () => buildSentence([filler, " where did my money go for ", payMethod, " transactions ", ender]),
            () => buildSentence([filler, " analyze expenses at ", merchant, " in ", date]),
            () => buildSentence(["show me my spending patterns for ", cat, " at ", merchant, " ", date]),
            () => buildSentence(["is there a spent analysis report for my ", payMethod, " on ", date]),
            () => buildSentence(["display categorical chart breakdown of ", cat, " costs"]),
            () => buildSentence(["pull up outflow metrics of ", cat, " at ", merchant, " immediately"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "VIEW_CASHFLOW": {
          const templates = [
            () => buildSentence([filler, " check how much money is left in my ", payMethod, " ", ender]),
            () => buildSentence([filler, " show monthly cashflow forecast for ", date, " ", ender]),
            () => buildSentence(["what is my net flow status of ", date, " with ", cat]),
            () => buildSentence(["display graph of income vs outflow at ", merchant, " during ", date]),
            () => buildSentence([filler, " check cash injection from ", src, " ", date, " ", ender]),
            () => buildSentence(["tell me my liquidity balance index representing ", cat])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "VIEW_NET_WORTH": {
          const templates = [
            () => buildSentence([filler, " display my net worth for ", date, " ", ender]),
            () => buildSentence([filler, " show my wealth balance including my ", assetTp, " holdings ", ender]),
            () => buildSentence(["calculate my total assets value including ", assetNm, " and ", liabilityTp, " debt"]),
            () => buildSentence([filler, " what is my exact net worth in ", cur, " currency ", ender]),
            () => buildSentence(["can you reveal my wealth index total calculation for ", date, " ", ender]),
            () => buildSentence(["sum of ", assetTp, " valuation and shares as of ", date])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "ADD_ASSET": {
          const templates = [
            () => buildSentence(["bought ", { text: assetTp, label: "assetType" }, " worth ", { text: formattedAmount, label: "value" }]),
            () => buildSentence(["added ", { text: assetNm, label: "assetName" }, " shares valued at ", { text: formattedAmount, label: "value" }]),
            () => buildSentence(["registered asset ", { text: assetNm, label: "assetName" }, " (", { text: assetTp, label: "assetType" }, ") with valuation ", { text: formattedAmount, label: "value" }, " on ", { text: date, label: "purchaseDate" }]),
            () => buildSentence(["invested in ", { text: assetTp, label: "assetType" }, " called ", { text: assetNm, label: "assetName" }, " that is worth ", { text: formattedAmount, label: "value" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "ADD_LIABILITY": {
          const templates = [
            () => buildSentence(["new credit card debt worth ", { text: formattedAmount, label: "amount" }]),
            () => buildSentence(["added student debt of ", { text: formattedAmount, label: "amount" }, " under ", { text: liabilityTp, label: "liabilityType" }]),
            () => buildSentence(["just took a ", { text: liabilityTp, label: "liabilityType" }, " of ", { text: formattedAmount, label: "amount" }, " at ", { text: intRate, label: "interestRate" }, " interest"]),
            () => buildSentence(["new liability registered: ", { text: liabilityTp, label: "liabilityType" }, " size of ", { text: formattedAmount, label: "amount" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "AFFORDABILITY_CHECK": {
          const templates = [
            () => buildSentence(["can I afford an ", { text: itemNm, label: "itemName" }]),
            () => buildSentence(["should I buy this ", { text: itemNm, label: "itemName" }, " for ", { text: formattedAmount, label: "amount" }]),
            () => buildSentence(["is it financially safe to spend ", { text: formattedAmount, label: "amount" }, " on ", { text: itemNm, label: "itemName" }]),
            () => buildSentence(["can my cash pocket accommodate a purchase of ", { text: itemNm, label: "itemName" }, " for ", { text: formattedAmount, label: "amount" }])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "SAVINGS_ADVICE": {
          const templates = [
            () => buildSentence([filler, " advice me on how can I save more money on ", cat, " ", ender]),
            () => buildSentence(["give me savings tips for ", date, " ", ender]),
            () => buildSentence([filler, " recommend budget cuts on ", cat, " at ", merchant, " ", ender]),
            () => buildSentence(["how can I build my ", goalNm, " emergency reserves faster in ", date]),
            () => buildSentence(["suggest monthly savings ideas for your ", cat, " category spending"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "FINANCIAL_HEALTH_CHECK": {
          const templates = [
            () => buildSentence([filler, " check how am I doing financially on ", date, " ", ender]),
            () => buildSentence(["rate my financial health regarding ", cat, " bills in ", date]),
            () => buildSentence([filler, " perform a complete financial sanity check on my ", payMethod, " spending"]),
            () => buildSentence(["give me cashflow diagnostics assessment for ", src, " revenues vs ", cat, " cost variables"]),
            () => buildSentence(["score my financial performance based on ", assetTp, " index parameters"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "VIEW_DASHBOARD": {
          const templates = [
            () => buildSentence([filler, " show my dashboard please for ", date, " ", ender]),
            () => buildSentence(["give me a financial snapshot of my ", payMethod, " limit ", ender]),
            () => buildSentence([filler, " show home snapshot panel for ", cat, " category summaries"]),
            () => buildSentence(["load main summary board screen view for ", date, " ", ender]),
            () => buildSentence(["open status panels for ", payMethod, " records immediately"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }

        case "UNKNOWN": {
          const unknownVerb = UNKNOWN_VERBS[Math.floor(Math.random() * UNKNOWN_VERBS.length)];
          const unknownTopic = UNKNOWN_TOPICS[Math.floor(Math.random() * UNKNOWN_TOPICS.length)];
          const unknownSport = UNKNOWN_SPORTS[Math.floor(Math.random() * UNKNOWN_SPORTS.length)];
          const unknownCity = UNKNOWN_CITIES[Math.floor(Math.random() * UNKNOWN_CITIES.length)];
          const unknownCoderTask = UNKNOWN_CODER_TASKS[Math.floor(Math.random() * UNKNOWN_CODER_TASKS.length)];

          const templates = [
            () => buildSentence([filler, " ", unknownVerb, " me details regarding ", unknownTopic, " ", ender]),
            () => buildSentence(["what is the weather like in ", unknownCity, " on ", date]),
            () => buildSentence(["who won the championship match of ", unknownSport, " recently"]),
            () => buildSentence(["how do you write a node process to ", unknownCoderTask]),
            () => buildSentence(["please show me some funny trivia about ", unknownTopic]),
            () => buildSentence(["hello assistant chatbot can you find directions from ", unknownCity, " back home"]),
            () => buildSentence(["tell me a silly story regarding ", unknownTopic, " immediately"])
          ];
          resultObj = templates[attempts % templates.length]();
          break;
        }
      }

      if (resultObj) {
        const { utterance, slots_filled, entities_token_iob } = resultObj;

        if (utterance && !uniqueUtterances.has(utterance)) {
          uniqueUtterances.add(utterance);

          const roll = Math.random();
          const split = roll < 0.8 ? "train" : roll < 0.9 ? "val" : "test";

          dataset.push({
            id: `${intent.slice(0, 3)}_${String(generatedCount).padStart(5, "0")}`,
            intent,
            utterance,
            split,
            slots_filled,
            entities_token_iob
          });

          generatedCount++;
        }
      }
    }
  }

  // Final structured JSON formatting conforming to rules schema
  const finalOutput = {
    metadata: {
      project: "Personal Finance Assistant NLP Dataset",
      taxonomy_version: "2.1.0",
      generated_at: new Date().toISOString(),
      total_records: dataset.length,
      splits: {
        training: dataset.filter(x => x.split === "train").length,
        validation: dataset.filter(x => x.split === "val").length,
        testing: dataset.filter(x => x.split === "test").length
      },
      classes: [
        { intent: "ADD_EXPENSE", description: "Logs outgoing transaction costs with category, merchant, date, and methods trackers." },
        { intent: "ADD_INCOME", description: "Registers capital gains and deposit updates with sources." },
        { intent: "ADD_COMMITMENT", description: "Tracks fixed repeating expenses like loan payouts and EMIs." },
        { intent: "ADD_GOAL", description: "Launches new target objectives for short and long-term storage configurations." },
        { intent: "UPDATE_GOAL_PROGRESS", description: "Files top-up credits directly to named goal wallets." },
        { intent: "CREATE_BUDGET", description: "Enforces specific ceiling triggers over a subset index category." },
        { intent: "VIEW_SPENDING_ANALYSIS", description: "Generates custom insights on where money goes." },
        { intent: "VIEW_CASHFLOW", description: "Inspects flow balances and net income/outgo parameters." },
        { intent: "VIEW_NET_WORTH", description: "Tallies asset and liability portfolios for total valuation score." },
        { intent: "ADD_ASSET", description: "Adds physical possessions, equities or deposits as assets." },
        { intent: "ADD_LIABILITY", description: "Adds debts and credit burdens directly as liabilities." },
        { intent: "AFFORDABILITY_CHECK", description: "Checks buying safety prior to major acquisitions." },
        { intent: "SAVINGS_ADVICE", description: "Outputs smart suggestions for minimizing waste and saving funds." },
        { intent: "FINANCIAL_HEALTH_CHECK", description: "Retrieves complete sanity scores on general finances." },
        { intent: "VIEW_DASHBOARD", description: "Launches central control deck summary dashboard view." },
        { intent: "UNKNOWN", description: "Graceful query fallback for unsupported generic queries." }
      ],
      slots: {
        spend_action: "Expended transaction verbs",
        salary_action: "Income transaction verbs",
        limit_action: "Budget restraint verbs",
        amount: "Monetary amount or numeric float constant",
        currency: "Standard abbreviation labels or characters",
        category: "System label groupings",
        merchant: "Seller vendor registries",
        paymentMethod: "Outgo path cards or digital ledger keys",
        date: "Datetime string relative frames",
        notes: "Notes describing contextual points for log audits",
        source: "Sender client or earnings origin details",
        frequency: "Recurrence period constants",
        commitmentType: "The sub-classification of recurring commitments",
        startDate: "Calendar anchor starting point",
        endDate: "Calendar ending cutoff anchor",
        goalName: "Explicit objective title label",
        targetAmount: "Goal target milestone quantity",
        targetDate: "Goal target timeline cutoff",
        assetType: "The structural class of precious assets",
        assetName: "The specific identifier of physical assets",
        value: "The net estimated value of the assets",
        liabilityType: "The structural class of debts",
        itemName: "Acquisitions checking objects",
        interestRate: "Annual percentage interest rates specified"
      }
    },
    samples: dataset
  };

  const publicDir = "./public";
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync("./personal_finance_dataset.json", JSON.stringify(finalOutput, null, 2));
  fs.writeFileSync("./public/personal_finance_dataset.json", JSON.stringify(finalOutput, null, 2));
  console.log(`Congratulations! Successfully generated and compiled ${dataset.length} high-fidelity records corresponding to the 16 requested intents!`);
}

generateDataset();
