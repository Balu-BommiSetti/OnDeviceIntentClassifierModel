import React, { useState, useMemo } from "react";
import { 
  Database, 
  Download, 
  RefreshCw, 
  Play, 
  ListFilter, 
  Tag, 
  Search, 
  Code2, 
  FileJson, 
  CheckCircle2, 
  Layers,
  ArrowRightLeft,
  CheckCircle
} from "lucide-react";

// Vocabulary Pools for Synthesizing Multi-class Intents
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

const CURRENCY_SYMBOLS = ["$", "USD", "INR", "euros", "bucks", "pounds", "dollars", "rupees", "grand", "yen"];

const AMOUNTS = [
  "15", "45.50", "90", "1200", "5", "10.25", "250", "3000", "20", "50", 
  "100", "500", "10", "9000", "twenty", "fifty", "a hundred", "five hundred", "ten bucks",
  "thirty-five", "eighty", "one thousand", "two thousand", "fifteen", "forty", "seventy-five",
  "8.50", "12.75", "150", "450", "1600", "2100", "65", "19.99", "29.99", "9.99", "12000", "75000", "5000"
];

const NOUNS_CATEGORY = [
  "groceries", "food", "coffee", "transportation", "entertainment", "subscriptions", 
  "utilities", "gas", "rent", "travel", "dining out", "fitness", "clothing", "education",
  "hobbies", "health", "insurance", "gifts", "charity", "investments", "gadgets", "parking",
  "concert tickets", "dentistry", "car rent", "books", "hardware", "pet care", "fast food"
];

const NOUNS_MERCHANT = [
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

interface GeneratedUtterance {
  id: string;
  intent: string;
  text: string;
  split: "train" | "val" | "test";
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    iob: string[];
  }>;
}

export function FinanceDatasetGenerator() {
  const [generationVolume, setGenerationVolume] = useState<number>(2500); // target per intent
  const [filterIntent, setFilterIntent] = useState<string>("all");
  const [filterSplit, setFilterSplit] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedList, setGeneratedList] = useState<GeneratedUtterance[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadedFromFile, setIsLoadedFromFile] = useState<boolean>(false);
  const itemsPerPage = 10;

  // Helper builder
  const buildSentenceLocal = (parts: Array<string | { text: string; label: string }>) => {
    let utterance = "";
    const entities_token_iob: GeneratedUtterance["entities"] = [];

    for (const part of parts) {
      if (typeof part === "string") {
        utterance += part;
      } else {
        const start = utterance.length;
        utterance += part.text;
        const end = utterance.length;

        entities_token_iob.push({
          text: part.text,
          label: part.label,
          start,
          end,
          iob: [`B-${part.label.toUpperCase()}`]
        });
      }
    }

    return { text: utterance, entities: entities_token_iob };
  };

  // Perform procedural combinatorial generation to achieve pure unique variation
  const handleSyntheticRun = () => {
    setIsGenerating(true);
    setIsLoadedFromFile(false);
    
    setTimeout(() => {
      const result: GeneratedUtterance[] = [];
      const usedCombinations = new Set<string>();

      // Targeted 16 intents to build
      const intents = [
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

      intents.forEach((intent) => {
        let count = 0;
        let attempts = 0;
        const targetCount = generationVolume;

        while (count < targetCount && attempts < targetCount * 50) {
          attempts++;
          let text = "";
          let entitiesLocal: GeneratedUtterance["entities"] = [];
          
          const verbS = VERBS_SPEND[Math.floor(Math.random() * VERBS_SPEND.length)];
          const verbI = VERBS_INCOME[Math.floor(Math.random() * VERBS_INCOME.length)];
          const verbL = VERBS_LIMIT[Math.floor(Math.random() * VERBS_LIMIT.length)];
          
          const amt = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
          const cur = CURRENCY_SYMBOLS[Math.floor(Math.random() * CURRENCY_SYMBOLS.length)];
          const formattedAmount = cur === "$" || cur === "INR" ? `${cur}${amt}` : `${amt} ${cur}`;

          const cat = NOUNS_CATEGORY[Math.floor(Math.random() * NOUNS_CATEGORY.length)];
          const merchant = NOUNS_MERCHANT[Math.floor(Math.random() * NOUNS_MERCHANT.length)];
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

          let formula: { text: string; entities: GeneratedUtterance["entities"] } | null = null;

          if (intent === "ADD_EXPENSE") {
            const templates = [
              () => buildSentenceLocal(["I ", { text: verbS, label: "spend_action" }, " ", { text: formattedAmount, label: "amount" }, " on groceries"]),
              () => buildSentenceLocal(["I ", { text: verbS, label: "spend_action" }, " ", { text: formattedAmount, label: "amount" }, " for ", { text: cat, label: "category" }, " at ", { text: merchant, label: "merchant" }, " via ", { text: payMethod, label: "paymentMethod" }, " on ", { text: date, label: "date" }]),
              () => buildSentenceLocal(["just ", { text: verbS, label: "spend_action" }, " ", { text: payMethod, label: "paymentMethod" }, " for ", { text: formattedAmount, label: "amount" }, " at ", { text: merchant, label: "merchant" }, " (", { text: notePart, label: "notes" }, ")"]),
              () => buildSentenceLocal(["ordered ", { text: cat, label: "category" }, " for ", { text: formattedAmount, label: "amount" }, " on ", { text: date, label: "date" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "ADD_INCOME") {
            const templates = [
              () => buildSentenceLocal(["salary credited ", { text: formattedAmount, label: "amount" }, " on ", { text: date, label: "date" }]),
              () => buildSentenceLocal(["received freelance payment of ", { text: formattedAmount, label: "amount" }, " from ", { text: src, label: "source" }, " on ", { text: date, label: "date" }]),
              () => buildSentenceLocal(["got bonus of ", { text: formattedAmount, label: "amount" }, " today, notes: ", { text: notePart, label: "notes" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "ADD_COMMITMENT") {
            const templates = [
              () => buildSentenceLocal(["monthly EMI of ", { text: formattedAmount, label: "amount" }]),
              () => buildSentenceLocal([{ text: freq, label: "frequency" }, " ", { text: commType, label: "commitmentType" }, " of ", { text: formattedAmount, label: "amount" }, " starting ", { text: date, label: "startDate" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "ADD_GOAL") {
            const templates = [
              () => buildSentenceLocal(["create ", { text: goalNm, label: "goalName" }, " goal"]),
              () => buildSentenceLocal(["save ", { text: formattedAmount, label: "targetAmount" }, " for ", { text: goalNm, label: "goalName" }, " by ", { text: "December next year", label: "targetDate" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "UPDATE_GOAL_PROGRESS") {
            const templates = [
              () => buildSentenceLocal(["add ", { text: formattedAmount, label: "amount" }, " to ", { text: goalNm, label: "goalName" }, " goal"]),
              () => buildSentenceLocal(["I saved another ", { text: formattedAmount, label: "amount" }, " for my ", { text: goalNm, label: "goalName" }, " fund"])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "CREATE_BUDGET") {
            const templates = [
              () => buildSentenceLocal(["set ", { text: cat, label: "category" }, " budget ", { text: formattedAmount, label: "amount" }]),
              () => buildSentenceLocal([{ text: verbL, label: "limit_action" }, " ceiling to ", { text: formattedAmount, label: "amount" }, " on ", { text: cat, label: "category" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "VIEW_SPENDING_ANALYSIS") {
            const templates = [
              () => buildSentenceLocal([filler, " show spending breakdown for ", cat, " on ", date, " ", ender]),
              () => buildSentenceLocal([filler, " where did my money go for ", payMethod, " transactions "])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "VIEW_CASHFLOW") {
            const templates = [
              () => buildSentenceLocal([filler, " check how much money is left in my ", payMethod, " ", ender]),
              () => buildSentenceLocal([filler, " show monthly cashflow forecast for ", date])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "VIEW_NET_WORTH") {
            const templates = [
              () => buildSentenceLocal([filler, " display my net worth for ", date]),
              () => buildSentenceLocal([filler, " show my wealth balance including my ", assetTp, " holdings"])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "ADD_ASSET") {
            const templates = [
              () => buildSentenceLocal(["bought ", { text: assetTp, label: "assetType" }, " worth ", { text: formattedAmount, label: "value" }]),
              () => buildSentenceLocal(["registered asset ", { text: assetNm, label: "assetName" }, " (", { text: assetTp, label: "assetType" }, ") with valuation ", { text: formattedAmount, label: "value" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "ADD_LIABILITY") {
            const templates = [
              () => buildSentenceLocal(["new credit card debt worth ", { text: formattedAmount, label: "amount" }]),
              () => buildSentenceLocal(["just took a ", { text: liabilityTp, label: "liabilityType" }, " of ", { text: formattedAmount, label: "amount" }, " at ", { text: intRate, label: "interestRate" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "AFFORDABILITY_CHECK") {
            const templates = [
              () => buildSentenceLocal(["can I afford an ", { text: itemNm, label: "itemName" }]),
              () => buildSentenceLocal(["should I buy this ", { text: itemNm, label: "itemName" }, " for ", { text: formattedAmount, label: "amount" }])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "SAVINGS_ADVICE") {
            const templates = [
              () => buildSentenceLocal([filler, " advice me on how can I save more money on ", cat]),
              () => buildSentenceLocal(["give me savings tips for ", date, " ", ender])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "FINANCIAL_HEALTH_CHECK") {
            const templates = [
              () => buildSentenceLocal([filler, " check how am I doing financially on ", date]),
              () => buildSentenceLocal(["rate my financial health regarding ", cat, " bills"])
            ];
            formula = templates[attempts % templates.length]();
          } else if (intent === "VIEW_DASHBOARD") {
            const templates = [
              () => buildSentenceLocal([filler, " show my dashboard please for ", date]),
              () => buildSentenceLocal(["give me a financial snapshot of my ", payMethod, " limit"])
            ];
            formula = templates[attempts % templates.length]();
          } else {
            // UNKNOWN
            const unknownVerb = UNKNOWN_VERBS[Math.floor(Math.random() * UNKNOWN_VERBS.length)];
            const unknownTopic = UNKNOWN_TOPICS[Math.floor(Math.random() * UNKNOWN_TOPICS.length)];
            const unknownCity = UNKNOWN_CITIES[Math.floor(Math.random() * UNKNOWN_CITIES.length)];
            const templates = [
              () => buildSentenceLocal([filler, " ", unknownVerb, " me details regarding ", unknownTopic]),
              () => buildSentenceLocal(["what is the weather like in ", unknownCity, " on ", date])
            ];
            formula = templates[attempts % templates.length]();
          }

          if (formula) {
            text = formula.text;
            entitiesLocal = formula.entities;
          }

          // Ensure strict uniqueness in synthetic output
          if (text && !usedCombinations.has(text)) {
            usedCombinations.add(text);
            
            // Standard NLP splits: Train (80%), Val (10%), Test (10%)
            const roll = Math.random();
            const split: GeneratedUtterance["split"] = roll < 0.8 ? "train" : roll < 0.9 ? "val" : "test";

            result.push({
              id: `${intent.slice(0, 3)}_${count}`,
              intent,
              text,
              split,
              entities: entitiesLocal
            });
            count++;
          }
        }
      });

      setGeneratedList(result);
      setCurrentPage(1);
      setIsGenerating(false);
    }, 600);
  };

  // Dedicated loader for offline compiled 40,000 master JSON
  const handleLoadMasterFile = () => {
    setIsGenerating(true);
    fetch("/personal_finance_dataset.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Target file not served.");
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.samples && Array.isArray(data.samples)) {
          const mapped: GeneratedUtterance[] = data.samples.map((item: any) => ({
            id: item.id,
            intent: item.intent,
            text: item.utterance,
            split: item.split,
            entities: (item.entities_token_iob || []).map((e: any) => ({
              text: e.text,
              label: e.label,
              start: e.range[0],
              end: e.range[1],
              iob: e.iob || []
            }))
          }));
          setGeneratedList(mapped);
          setIsLoadedFromFile(true);
          setCurrentPage(1);
        } else {
          throw new Error("Invalid schema structure.");
        }
        setIsGenerating(false);
      })
      .catch((err) => {
        console.warn("Falling back to standard browser-based generator on client boot: ", err.message);
        handleSyntheticRun();
      });
  };

  // Run initial loading on view load
  React.useEffect(() => {
    handleLoadMasterFile();
  }, []);

  // Filtered dataset calculations
  const filteredData = useMemo(() => {
    return generatedList.filter((item) => {
      const matchIntent = filterIntent === "all" || item.intent === filterIntent;
      const matchSplit = filterSplit === "all" || item.split === filterSplit;
      const matchSearch = item.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.intent.toLowerCase().includes(searchTerm.toLowerCase());
      return matchIntent && matchSplit && matchSearch;
    });
  }, [generatedList, filterIntent, filterSplit, searchTerm]);

  // Paginated elements
  const displayedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Split-specific counts
  const splitMetrics = useMemo(() => {
    const counts = { train: 0, val: 0, test: 0 };
    generatedList.forEach(item => {
      counts[item.split]++;
    });
    return counts;
  }, [generatedList]);

  // Trigger export system down to local file browser
  const triggerDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify({
        metadata: {
          project: "Personal Finance Assistant",
          generator: "Optimized Offline Combinatorial Synthesizer",
          total_records: generatedList.length,
          generated_at: new Date().toISOString(),
          splits: {
            training: splitMetrics.train,
            validation: splitMetrics.val,
            testing: splitMetrics.test
          },
          intent_taxonomy: [
            { label: "ADD_EXPENSE", description: "Logs outgoing transaction costs with category, merchant, date, and methods trackers." },
            { label: "ADD_INCOME", description: "Registers capital gains and deposit updates with sources." },
            { label: "ADD_COMMITMENT", description: "Tracks fixed repeating expenses like loan payouts and EMIs." },
            { label: "ADD_GOAL", description: "Launches new target objectives for short and long-term storage configurations." },
            { label: "UPDATE_GOAL_PROGRESS", description: "Files top-up credits directly to named goal wallets." },
            { label: "CREATE_BUDGET", description: "Enforces specific ceiling triggers over a subset index category." },
            { label: "VIEW_SPENDING_ANALYSIS", description: "Generates custom insights on where money goes." },
            { label: "VIEW_CASHFLOW", description: "Inspects flow balances and net income/outgo parameters." },
            { label: "VIEW_NET_WORTH", description: "Tallies asset and liability portfolios for total valuation score." },
            { label: "ADD_ASSET", description: "Adds physical possessions, equities or deposits as assets." },
            { label: "ADD_LIABILITY", description: "Adds debts and credit burdens directly as liabilities." },
            { label: "AFFORDABILITY_CHECK", description: "Checks buying safety prior to major acquisitions." },
            { label: "SAVINGS_ADVICE", description: "Outputs smart suggestions for minimizing waste and saving funds." },
            { label: "FINANCIAL_HEALTH_CHECK", description: "Retrieves complete sanity scores on general finances." },
            { label: "VIEW_DASHBOARD", description: "Launches central control deck summary dashboard view." },
            { label: "UNKNOWN", description: "Graceful query fallback for unsupported generic queries." }
          ],
          entity_slot_schema: {
            "spend_action": "The expenditure action verb",
            "salary_action": "The salary/earnings action verb",
            "limit_action": "The budget setting action verb",
            "amount": "Explicit numerical values",
            "currency": "Standard symbol or word",
            "merchant": "Physical shop, corporate vendor, or recipient person",
            "category": "Classification metadata group",
            "notes": "Contextual notes",
            "source": "Salary or gig earnings origin detail",
            "frequency": "How often repeating payment triggers",
            "commitmentType": "Fixed liability/repeating payment class",
            "startDate": "Anchor start date for commitments",
            "endDate": "Anchor cutoff date for commitments",
            "goalName": "Goal title name",
            "targetAmount": "Full milestone cost goal target",
            "targetDate": "Cutoff date for goals",
            "assetType": "Class of holding asset bought",
            "assetName": "Detailed name of stock/asset holding",
            "value": "Calculated value of asset registered",
            "liabilityType": "Debt/obligation structural class",
            "interestRate": "Yearly APR interest",
            "itemName": "Checking item target names"
          }
        },
        dataset: generatedList.map(item => ({
          id: item.id,
          intent: item.intent,
          utterance: item.text,
          split: item.split,
          slots_filled: item.entities.reduce((acc: any, entity) => {
            acc[entity.label] = entity.text;
            return acc;
          }, {}),
          entities_token_iob: item.entities.map(e => ({
            text: e.text,
            label: e.label,
            range: [e.start, e.end],
            iob: e.iob
          }))
        }))
      }, null, 2)
    );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `personal_finance_nlp_dataset_${generatedList.length}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls Banner */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-slate-800 font-bold text-lg flex items-center space-x-2">
              <Database className="w-5 h-5 text-indigo-500" />
              <span>High-Fidelity NLP Dataset Generator</span>
            </h2>
            {isLoadedFromFile ? (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>160,000 Master File Active</span>
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                <span>Procedural Synth Cache</span>
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5">
            Procedurally matches 16 multi-class finance intents against dozens of dynamic entities/slots using extreme lexical variety.
          </p>
        </div>

        {/* Configurations */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-500 font-medium font-sans">Vol. Per Intent:</span>
            <select
              value={generationVolume}
              onChange={(e) => setGenerationVolume(Number(e.target.value))}
              className="bg-transparent font-bold font-mono text-slate-800 focus:outline-none cursor-pointer"
              disabled={isLoadedFromFile}
            >
              <option value="100">100 (Dev)</option>
              <option value="1000">1,000 (Medium)</option>
              <option value="2500">2,500 (Production Target)</option>
              <option value="5000">5,000 (Supreme Benchmark)</option>
            </select>
          </div>

          {!isLoadedFromFile ? (
            <>
              <button
                onClick={handleLoadMasterFile}
                disabled={isGenerating}
                className="px-4 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-55"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Load 160k Master File</span>
              </button>

              <button
                onClick={handleSyntheticRun}
                disabled={isGenerating}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-55"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                <span>Synthesize Cache</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleSyntheticRun()}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-55"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Back to Synthesizer</span>
            </button>
          )}

          <button
            onClick={triggerDownload}
            disabled={generatedList.length === 0}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-55"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Analytics stats graphs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Total Dataset Rows</span>
          <span className="text-2xl font-black font-mono text-slate-800">
            {generatedList.length.toLocaleString()}
          </span>
          <span className="text-[10px] text-indigo-600 block font-medium">100% Unique Combinations</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Training Split (80%)</span>
          <span className="text-2xl font-black font-mono text-emerald-600">
            {splitMetrics.train.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block leading-tight">For local weights backprop</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Validation Split (10%)</span>
          <span className="text-2xl font-black font-mono text-blue-600">
            {splitMetrics.val.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block leading-tight">For hyper-parameter tweaks</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-sans block">Evaluation Split (10%)</span>
          <span className="text-2xl font-black font-mono text-purple-600">
            {splitMetrics.test.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block leading-tight">For final F1 accuracy diagnostics</span>
        </div>

      </div>

      {/* Filter and Table Panel */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* Table header bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Intent Filter */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-400 font-medium">Intent:</span>
              <select
                value={filterIntent}
                onChange={(e) => { setFilterIntent(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">Check All Intents</option>
                <option value="ADD_EXPENSE">ADD_EXPENSE</option>
                <option value="ADD_INCOME">ADD_INCOME</option>
                <option value="ADD_COMMITMENT">ADD_COMMITMENT</option>
                <option value="ADD_GOAL">ADD_GOAL</option>
                <option value="UPDATE_GOAL_PROGRESS">UPDATE_GOAL_PROGRESS</option>
                <option value="CREATE_BUDGET">CREATE_BUDGET</option>
                <option value="VIEW_SPENDING_ANALYSIS">VIEW_SPENDING_ANALYSIS</option>
                <option value="VIEW_CASHFLOW">VIEW_CASHFLOW</option>
                <option value="VIEW_NET_WORTH">VIEW_NET_WORTH</option>
                <option value="ADD_ASSET">ADD_ASSET</option>
                <option value="ADD_LIABILITY">ADD_LIABILITY</option>
                <option value="AFFORDABILITY_CHECK">AFFORDABILITY_CHECK</option>
                <option value="SAVINGS_ADVICE">SAVINGS_ADVICE</option>
                <option value="FINANCIAL_HEALTH_CHECK">FINANCIAL_HEALTH_CHECK</option>
                <option value="VIEW_DASHBOARD">VIEW_DASHBOARD</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            {/* Split Filter */}
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-400 font-medium">Split:</span>
              <select
                value={filterSplit}
                onChange={(e) => { setFilterSplit(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-slate-200 px-2 py-1 rounded text-[11px] font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">View All Splits</option>
                <option value="train">Train only</option>
                <option value="val">Val only</option>
                <option value="test">Test only</option>
              </select>
            </div>

          </div>

          {/* Search */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Search synthesized text..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-4 py-1 bg-white border border-slate-200 rounded text-xs w-full md:w-60 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Tabulator View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="py-3 px-4">Dataset ID</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Synthesized Utterance</th>
                <th className="py-3 px-4">Extractable Slots (Entities)</th>
                <th className="py-3 px-4 text-center">Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    No matching generated rows found. Change filters or click &ldquo;Generate Models&rdquo;.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {item.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[10px] font-bold">
                        {item.intent}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 italic max-w-sm">
                      &ldquo;{item.text}&rdquo;
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.entities.map((entity, i) => (
                          <span 
                            key={i} 
                            className="bg-indigo-50/60 border border-indigo-100 text-[10px] text-indigo-700 px-1.5 py-0.5 rounded flex items-center space-x-1"
                          >
                            <span className="font-bold">{entity.text}</span>
                            <span className="text-[8px] text-slate-400 uppercase">({entity.label})</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        item.split === "train" 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                          : item.split === "val"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}>
                        {item.split}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tabulator Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length.toLocaleString()} matching rows
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-45 hover:bg-slate-50 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-600 disabled:opacity-45 hover:bg-slate-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
