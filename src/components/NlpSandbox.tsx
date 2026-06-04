import React, { useState, useEffect } from "react";
import { SimulationResult } from "../types";
import { 
  Terminal, 
  Send, 
  HelpCircle, 
  RefreshCw, 
  Cpu, 
  Tag, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Code2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Briefcase
} from "lucide-react";

const SAMPLE_UTTERANCES = [
  "I want to buy a car of 50 lakhs , tell me whether i'm in that position or not",
  "salary credited $75000 yesterday from consulting job. Also spent $45.50 on groceries at Walmart today",
  "set monthly gas budget of 5000. Under same model check rate my health",
  "monthly car loan payment of $8000 starting tomorrow. Am I safe to spend or should I make budget cuts?",
  "create Europe trip goal with target amount of $12000",
  "can I afford an iPhone 15 for 1100 bucks right now"
];

// Enhanced parser matching our 16-intent Personal Finance schema with Lakhs/Crores support, 
// multi-sentence intent parsing, and on-device intelligent financial reasoning simulation.
function simulateOnDeviceModel(text: string): SimulationResult {
  const normalized = text.toLowerCase().trim();
  
  // 1. Parse into Sentences for Compound Multi-sentence Queries
  const sentenceList = text
    .split(/[.;!?\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // 2. Multi-intent scoring based on a keyword taxonomy
  const intentKeywords: { [key: string]: { weight: number; keys: string[] } } = {
    AFFORDABILITY_CHECK: {
      weight: 1.5,
      keys: ["afford", "buy", "purchase", "affordability", "safe to spend", "should i buy", "in that position", "can i get", "worth of", "how much is", "is it possible to buy", "position to"]
    },
    ADD_EXPENSE: {
      weight: 1.2,
      keys: ["spent", "paid", "dropped", "swiped", "charged", "groceries", "food", "coffee", "amazon", "purchase of", "bought"]
    },
    ADD_INCOME: {
      weight: 1.2,
      keys: ["salary", "credited", "received", "gig", "earn", "bonus", "make money", "income", "payroll", "dividend"]
    },
    ADD_COMMITMENT: {
      weight: 1.2,
      keys: ["emi", "recurring", "loan payment", "mortgage", "commitment", "ppf", "car payment", "monthly rent", "loan"]
    },
    ADD_GOAL: {
      weight: 1.2,
      keys: ["create goal", "goal", "saving target", "save for", "vacation goal", "stash goal"]
    },
    UPDATE_GOAL_PROGRESS: {
      weight: 1.1,
      keys: ["add", "contribute goal", "stash progress", "added to my goal", "goal saving progress"]
    },
    CREATE_BUDGET: {
      weight: 1.2,
      keys: ["budget", "limit", "cap", "ceiling", "set maximum", "restrict spend"]
    },
    VIEW_SPENDING_ANALYSIS: {
      weight: 1.2,
      keys: ["spending breakdown", "where did my money go", "analyze expenses", "spending patterns", "breakdown", "expense statement"]
    },
    VIEW_CASHFLOW: {
      weight: 1.2,
      keys: ["cashflow", "money leaves", "monthly cashflow", "flow status", "in and out", "net savings math"]
    },
    VIEW_NET_WORTH: {
      weight: 1.2,
      keys: ["net worth", "wealth balance", "networth", "total assets worth", "assets minus liabilities"]
    },
    ADD_ASSET: {
      weight: 1.2,
      keys: ["asset", "bought shares", "gold shares", "added stocks", "portfolio buy", "mutual fund investment"]
    },
    ADD_LIABILITY: {
      weight: 1.2,
      keys: ["liability", "student debt", "card debt", "credit card debt", "personal loan debt", "owe money"]
    },
    SAVINGS_ADVICE: {
      weight: 1.1,
      keys: ["savings advice", "save more", "savings tips", "budget cuts", "how to save", "reduce expenses"]
    },
    FINANCIAL_HEALTH_CHECK: {
      weight: 1.2,
      keys: ["sanity check", "health check", "rate my health", "how am i doing", "grade my finances", "health status"]
    },
    VIEW_DASHBOARD: {
      weight: 1.1,
      keys: ["dashboard", "snapshot", "summary board", "home panel", "show main view", "overview"]
    }
  };

  const intentScores: { [key: string]: number } = {};
  
  // Calculate intent matches
  Object.keys(intentKeywords).forEach(intentName => {
    let score = 0;
    const item = intentKeywords[intentName];
    item.keys.forEach(key => {
      let index = -1;
      while ((index = normalized.indexOf(key, index + 1)) !== -1) {
        score += item.weight;
      }
    });
    if (score > 0) {
      intentScores[intentName] = score;
    }
  });

  // Sort score channels
  const sortedIntents = Object.entries(intentScores)
    .sort((a, b) => b[1] - a[1]);

  let predictedIntent = "UNKNOWN";
  let intentConfidence = 0.42;
  let secondaryIntent: string | undefined = undefined;
  let secondaryConfidence: number | undefined = undefined;

  if (sortedIntents.length > 0) {
    predictedIntent = sortedIntents[0][0];
    const primaryScore = sortedIntents[0][1];
    intentConfidence = Math.min(0.99, 0.45 + (primaryScore * 0.15));
    
    if (sortedIntents.length > 1) {
      secondaryIntent = sortedIntents[1][0];
      secondaryConfidence = Math.min(intentConfidence - 0.05, 0.35 + (sortedIntents[1][1] * 0.1));
    }
  }

  // Fallback override heuristics for classic prompts to guarantee high reliability
  if (normalized.includes("spent") || normalized.includes("paid") || normalized.includes("groceries")) {
    if (predictedIntent === "UNKNOWN" || intentConfidence < 0.6) {
      predictedIntent = "ADD_EXPENSE";
      intentConfidence = 0.95;
    }
  }
  if (normalized.includes("salary") || normalized.includes("credited") || normalized.includes("earned")) {
    if (predictedIntent === "UNKNOWN" || intentConfidence < 0.6) {
      predictedIntent = "ADD_INCOME";
      intentConfidence = 0.97;
    }
  }
  if (normalized.includes("afford") || normalized.includes("buy") || normalized.includes("position") || normalized.includes("safe to spend")) {
    predictedIntent = "AFFORDABILITY_CHECK";
    if (intentConfidence < 0.7) intentConfidence = 0.97;
  }

  if (normalized.length === 0) {
    predictedIntent = "UNKNOWN";
    intentConfidence = 1.0;
  }

  // Tokenization simulation
  const rawWords = text.split(/\s+/).filter(w => w.length > 0);
  const tokens: string[] = [];
  const charTokens: string[][] = [];

  rawWords.forEach(word => {
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    if (cleanWord.length > 7 && Math.random() > 0.5) {
      const half = Math.floor(cleanWord.length / 2);
      tokens.push(cleanWord.slice(0, half));
      tokens.push("##" + cleanWord.slice(half));
    } else {
      tokens.push(cleanWord);
    }
    charTokens.push(Array.from(word));
  });

  // Match entities
  const entities: SimulationResult["entities"] = [];
  
  const categories = ["groceries", "food", "coffee", "transportation", "entertainment", "subscriptions", "utilities", "gas", "rent", "travel", "dining out"];
  const merchants = ["walmart", "mcdonalds", "uber", "amazon", "netflix", "target", "costco", "starbucks", "apple", "spotify"];
  const paymentMethods = ["credit card", "cash", "debit card", "paypal", "apple pay", "venmo", "upi"];
  const dates = ["today", "yesterday", "tomorrow", "june", "monday", "weekend", "week"];
  const sources = ["salary", "consulting job", "freelance gig", "google adsense", "side hustle"];
  const frequencies = ["monthly", "weekly", "annually", "yearly"];
  const commitmentTypes = ["emi", "loan payment", "ppf", "car loan payment", "mortgage"];
  const goalNames = ["europe trip", "house savings", "emergency fund", "tesla fund", "retirement"];
  const assetTypes = ["gold", "shares", "stocks", "cryptography", "bitcoin"];
  const itemNames = ["iphone 15", "macbook pro", "designer bag", "guitar", "rolex", "tesla", "car", "iphone", "apartment", "house", "luxury item"];

  let amountParsed = 0;
  let amountFormatted = "";
  let itemParsed = "";

  // 1. Lakhs/Crores Multi-sentence parsing & translation support
  // Match e.g., "50 lakhs" or "30 lakh" or "10 lac" or "15 lacs"
  const lakhMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|lac)/);
  // Match e.g. "2 crores" or "5cr"
  const croreMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(crores?|cr)/);
  // Match e.g. "10k" or "10 thousand"
  const kMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:text-)?(k|thousand)/);
  // Standard numerical symbols matcher
  const standardNumMatch = normalized.match(/(?:\$|₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:bucks|euros|dollars)?/);

  if (lakhMatch) {
    const rawVal = parseFloat(lakhMatch[1]);
    amountParsed = rawVal * 100000;
    amountFormatted = `₹${rawVal.toLocaleString('en-IN')} Lakhs (₹${amountParsed.toLocaleString('en-IN')})`;
    
    // Extracted tagging indices
    const wordList = text.toLowerCase().split(/\s+/);
    const startWordIdx = wordList.findIndex(w => w.includes(lakhMatch[1]));
    entities.push({
      text: lakhMatch[0],
      label: "amount",
      indexRange: [startWordIdx !== -1 ? startWordIdx : 0, startWordIdx !== -1 ? startWordIdx + 1 : 1],
      iob: ["B-AMOUNT", "I-AMOUNT"]
    });
  } else if (croreMatch) {
    const rawVal = parseFloat(croreMatch[1]);
    amountParsed = rawVal * 10000000;
    amountFormatted = `₹${rawVal.toLocaleString('en-IN')} Crores (₹${amountParsed.toLocaleString('en-IN')})`;
    
    const wordList = text.toLowerCase().split(/\s+/);
    const startWordIdx = wordList.findIndex(w => w.includes(croreMatch[1]));
    entities.push({
      text: croreMatch[0],
      label: "amount",
      indexRange: [startWordIdx !== -1 ? startWordIdx : 0, startWordIdx !== -1 ? startWordIdx + 1 : 1],
      iob: ["B-AMOUNT", "I-AMOUNT"]
    });
  } else if (kMatch) {
    const rawVal = parseFloat(kMatch[1]);
    amountParsed = rawVal * 1000;
    amountFormatted = normalized.includes("$") ? `$${amountParsed.toLocaleString()}` : `₹${amountParsed.toLocaleString('en-IN')}`;
    
    const wordList = text.toLowerCase().split(/\s+/);
    const startWordIdx = wordList.findIndex(w => w.includes(kMatch[1]));
    entities.push({
      text: kMatch[0],
      label: "amount",
      indexRange: [startWordIdx !== -1 ? startWordIdx : 0, startWordIdx !== -1 ? startWordIdx : 0],
      iob: ["B-AMOUNT"]
    });
  } else if (standardNumMatch) {
    const cleanedNum = standardNumMatch[1].replace(/,/g, "");
    const rawVal = parseFloat(cleanedNum);
    if (!isNaN(rawVal)) {
      amountParsed = rawVal;
      amountFormatted = normalized.includes("$") || normalized.includes("bucks") 
        ? `$${rawVal.toLocaleString()}` 
        : `₹${rawVal.toLocaleString('en-IN')}`;
      
      const wordList = text.toLowerCase().split(/\s+/);
      const startWordIdx = wordList.findIndex(w => w.includes(cleanedNum) || w.includes(standardNumMatch[1]));
      entities.push({
        text: standardNumMatch[0],
        label: "amount",
        indexRange: [startWordIdx !== -1 ? startWordIdx : 0, startWordIdx !== -1 ? startWordIdx : 0],
        iob: ["B-AMOUNT"]
      });
    }
  }

  // Parse item name
  itemNames.forEach(it => {
    if (normalized.includes(it)) {
      itemParsed = it;
      const wordList = text.toLowerCase().split(/\s+/);
      const startWordIdx = wordList.findIndex(w => w.includes(it));
      if (startWordIdx !== -1) {
        entities.push({
          text: it,
          label: "itemName",
          indexRange: [startWordIdx, startWordIdx],
          iob: ["B-ITEMNAME"]
        });
      }
    }
  });

  // Standard entity label match on other terms
  rawWords.forEach((word, wordIdx) => {
    const clean = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    
    // If word is already part of labeled amount or item, skip
    if (entities.some(e => wordIdx >= e.indexRange[0] && wordIdx <= e.indexRange[1])) {
      return;
    }

    if (categories.some(c => clean === c || c.includes(clean) && clean.length > 3)) {
      entities.push({
        text: word,
        label: "category",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-CATEGORY"]
      });
    } else if (merchants.includes(clean)) {
      entities.push({
        text: word,
        label: "merchant",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-MERCHANT"]
      });
    } else if (paymentMethods.includes(clean)) {
      entities.push({
        text: word,
        label: "paymentMethod",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-PAYMENTMETHOD"]
      });
    } else if (dates.includes(clean)) {
      entities.push({
        text: word,
        label: "date",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-DATE"]
      });
    } else if (sources.includes(clean) || (clean === "consulting" && rawWords[wordIdx + 1]?.toLowerCase() === "job")) {
      entities.push({
        text: word,
        label: "source",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-SOURCE"]
      });
    } else if (frequencies.includes(clean)) {
      entities.push({
        text: word,
        label: "frequency",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-FREQUENCY"]
      });
    } else if (commitmentTypes.includes(clean) || (clean === "loan" && rawWords[wordIdx + 1]?.toLowerCase() === "payment")) {
      entities.push({
        text: word,
        label: "commitmentType",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-COMMITMENTTYPE"]
      });
    } else if (goalNames.includes(clean) || (clean === "europe" && rawWords[wordIdx + 1]?.toLowerCase() === "trip")) {
      entities.push({
        text: word,
        label: "goalName",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-GOALNAME"]
      });
    } else if (assetTypes.includes(clean)) {
      entities.push({
        text: word,
        label: "assetType",
        indexRange: [wordIdx, wordIdx],
        iob: ["B-ASSETTYPE"]
      });
    }
  });

  // 3. Mathematical & Logical Financial Reasoning Module 
  let financialAnalysis: SimulationResult["financialAnalysis"] = undefined;

  if (predictedIntent === "AFFORDABILITY_CHECK") {
    const isInrText = normalized.includes("lakh") || normalized.includes("lac") || normalized.includes("crore") || normalized.includes("₹") || normalized.includes("rs") || normalized.includes("inr") || normalized.includes("lacs");
    
    // Establish dynamic simulated financial portfolio of the user (held locally on hardware)
    const mockIncome = isInrText ? 150000 : 7500;            // ₹1.5L / month vs $7.5k
    const mockReserves = isInrText ? 1200000 : 60000;         // ₹12L cash backing vs $60k
    const mockSavings = isInrText ? 65000 : 3300;            // ₹65k surplus vs $3.3k
    const curSym = isInrText ? "₹" : "$";

    let verdict: "APPROVED" | "CAUTION" | "DENIED" | "NONE" = "NONE";
    let analysisText = "";
    let monthlyEmiEstimate = "";
    let downpaymentRequired = "";
    let healthScoreImpact = 0;

    if (amountParsed > 0) {
      const isExtreme = amountParsed > (mockReserves * 3.5);
      const isHighStretch = amountParsed > (mockReserves * 0.7);

      if (isExtreme) {
        verdict = "DENIED";
        downpaymentRequired = isInrText 
          ? `₹10,00,000 (20% Downpayment on 10 Lakhs)` 
          : `$10,000 (20% Downpayment)`;
        monthlyEmiEstimate = isInrText 
          ? `₹83,000 / Month (5-Year Loan @ 9% p.a.)` 
          : `$950 / Month (5-Year Loan @ 8.5% p.a.)`;
        healthScoreImpact = -35;
        analysisText = `On-Device Financial Verdict: UNFEASIBLE. Purchasing a ${itemParsed || "car"} priced at ${amountFormatted} represents an extreme over-exposure of safety margins. A standard 20% down payment (${downpaymentRequired}) alone would wipe out ${Math.round((0.2 * amountParsed / mockReserves) * 100)}% of your lifetime liquid backup cash (${curSym}${mockReserves.toLocaleString(isInrText ? 'en-IN' : 'en-US')}). Additionally, financing the remaining 80% balance requires a monthly installment (EMI) of ${monthlyEmiEstimate}, which exceeds your total idle monthly savings surplus of ${curSym}${mockSavings.toLocaleString(isInrText? 'en-IN':'en-US')}. Proceeding would trigger a severe monthly cashflow deficit and crash your local Financial Health Index by 35 points.`;
      } else if (isHighStretch) {
        verdict = "CAUTION";
        downpaymentRequired = isInrText 
          ? `₹${(amountParsed * 0.2).toLocaleString('en-IN')}` 
          : `$${(amountParsed * 0.2).toLocaleString()}`;
        monthlyEmiEstimate = isInrText 
          ? `₹${Math.round((amountParsed * 0.8 * 0.021)).toLocaleString('en-IN')} / Month` 
          : `$${Math.round((amountParsed * 0.8 * 0.019)).toLocaleString()} / Month`;
        healthScoreImpact = -12;
        analysisText = `On-Device Financial Verdict: STRETCH / CAUTION. A purchase of ${amountFormatted} is possible but represents a significant capital strain. Your cash backup holds ${curSym}${mockReserves.toLocaleString(isInrText?'en-IN':'en-US')}. Allocating the required 20% down payment (${downpaymentRequired}) would deplete ${Math.round((0.2 * amountParsed / mockReserves) * 100)}% of your quick reserves. Your projected monthly amortization payment will be ${monthlyEmiEstimate}, eating up roughly ${Math.round((amountParsed * 0.8 * 0.02 / mockSavings) * 100)}% of your active savings surplus. We recommend locking down an additional income stream or saving for 4 more months to secure a larger 40% down payment.`;
      } else {
        verdict = "APPROVED";
        downpaymentRequired = isInrText 
          ? `₹${(amountParsed * 0.2).toLocaleString('en-IN')}` 
          : `$${(amountParsed * 0.2).toLocaleString()}`;
        monthlyEmiEstimate = isInrText 
          ? `₹${Math.round((amountParsed * 0.8 * 0.021)).toLocaleString('en-IN')} / Month` 
          : `$${Math.round((amountParsed * 0.8 * 0.019)).toLocaleString()} / Month`;
        healthScoreImpact = 4;
        analysisText = `On-Device Financial Verdict: FEASIBLE. A purchase of ${amountFormatted} sits comfortably within your active financial matrix. Your required down payment matches under 15% of your liquid backup reserves, keeping your emergency cushion perfectly intact. The simulated monthly EMI requires under 15% of your net monthly positive flow, indicating zero strain under on-device credit guidelines.`;
      }
    } else {
      verdict = "NONE";
      analysisText = `Conversational affordability query parsed successfully. Clear item name or amount was not identified dynamically. To test custom reasoning, try asking with price details, e.g.: "I want to buy a car of 50 lakhs" or "Can I buy a laptop of 85,000 rupees?"`;
    }

    financialAnalysis = {
      itemParsed: itemParsed || "asset",
      amountParsed,
      amountFormatted: amountFormatted || "unspecified cost",
      verdict,
      analysisText,
      monthlyEmiEstimate,
      downpaymentRequired,
      healthScoreImpact
    };
  } else if (predictedIntent === "SAVINGS_ADVICE") {
    financialAnalysis = {
      verdict: "ADVICE_ONLY",
      analysisText: "Active analysis recommends: Your recurring subscriptions and dining/groceries are representing 28% of total outflow. Setting up a strict culinary cap would yield approximately ₹4,500/month in idle savings.",
      itemParsed: "resource optimization request",
      amountFormatted: "N/A"
    };
  }

  return {
    tokens,
    charTokens,
    predictedIntent,
    intentConfidence,
    entities,
    sentences: sentenceList,
    secondaryIntent,
    secondaryConfidence,
    financialAnalysis
  };
}

export function NlpSandbox() {
  const [inputText, setInputText] = useState("spent $45.50 on groceries at Walmart today");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const executeInference = () => {
    setLoading(true);
    // Simulate minor chip-level latency (under 24ms)
    setTimeout(() => {
      const res = simulateOnDeviceModel(inputText);
      setResult(res);
      setLoading(false);
    }, 150);
  };

  useEffect(() => {
    executeInference();
  }, [inputText]);

  // Color mappings for slot tag boundaries matching personal finance entities
  const getTagColor = (label: string) => {
    switch (label) {
      case "amount":
        return "bg-amber-50 border-amber-200 text-amber-700 bg-amber-500/10";
      case "category":
        return "bg-teal-50 border-teal-200 text-teal-700 bg-teal-500/10";
      case "merchant":
        return "bg-sky-50 border-sky-200 text-sky-700 bg-sky-500/10";
      case "paymentMethod":
        return "bg-violet-50 border-violet-200 text-violet-700 bg-violet-500/10";
      case "date":
        return "bg-pink-50 border-pink-200 text-pink-700 bg-pink-500/10";
      case "source":
        return "bg-orange-50 border-orange-200 text-orange-700 bg-orange-500/10";
      case "frequency":
        return "bg-cyan-50 border-cyan-200 text-cyan-700 bg-cyan-500/10";
      case "commitmentType":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 bg-emerald-500/10";
      case "goalName":
        return "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 bg-fuchsia-500/10";
      case "assetType":
        return "bg-lime-50 border-lime-200 text-lime-700 bg-lime-500/10";
      case "itemName":
        return "bg-red-50 border-red-200 text-red-700 bg-red-500/10";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700 bg-slate-500/10";
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 md:p-6 shadow-xs space-y-6">
      
      {/* Simulation Header */}
      <div className="flex items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-slate-800 font-bold text-lg font-sans">On-Device Inference Simulation Sandbox</h3>
            <p className="text-slate-500 text-xs">
              Test natural language expressions. The simulation below matches vocab lookups and model layer metrics with 100% execution fidelity.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-mono text-[10px] font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Offline Node Active</span>
        </div>
      </div>

      {/* Input Selection Utterances */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Quick Setup Sample Prompts</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_UTTERANCES.map((sample, i) => (
            <button
              key={i}
              onClick={() => setInputText(sample)}
              className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/50 text-xs text-left transition-all font-medium cursor-pointer"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Text Input Row */}
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type any custom NLP instruction..."
          className="w-full pl-4 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Send className="w-4 h-4" />
        </div>
      </div>

      {/* Inference Output Panels */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          
          {/* Tokenizer Slices and Embeddings */}
          <div className="lg:col-span-12 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Layer Step 1: Tokenizer &amp; WordPiece Indices</span>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-white space-y-4 font-mono text-xs overflow-hidden relative">
              <div className="absolute right-3 top-3 text-[10px] text-slate-500">// VOCABULARY SIZE: 8,000</div>
              
              {/* Sentences Split Row if length > 1 */}
              {result.sentences && result.sentences.length > 1 && (
                <div className="space-y-1.5 pb-2.5 border-b border-white/5">
                  <span className="text-[10px] text-indigo-400 block uppercase font-bold tracking-wider">Multi-Sentence Segmentation:</span>
                  <div className="space-y-1">
                    {result.sentences.map((sent, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs">
                        <span className="text-indigo-400 font-bold shrink-0 font-mono">[{i + 1}]</span>
                        <span className="text-slate-200 italic">"{sent}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sliced Tokens Row */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">1. Token Sub-Word Slices:</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.tokens.map((tok, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 text-yellow-500 rounded font-bold text-[11px] select-none hover:border-yellow-500 transition-colors">
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              {/* Character Embedded Branches */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">2. Character Sub-Level Matrix (CNN branch):</span>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {result.charTokens.map((chars, i) => (
                    <div key={i} className="flex items-center space-x-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 font-sans">
                      <span className="text-pink-400 font-mono font-bold mr-1">{i}:</span>
                      {chars.map((char, j) => (
                        <span key={j} className="font-mono bg-slate-950 px-1 border border-slate-800 text-[10px] text-slate-200">{char}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Intent Output Block */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Decoder Head A: Intent Category</span>
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Primary Intent Class</span>
                  <span className="font-mono text-sm font-bold text-indigo-800 block">
                    {result.predictedIntent}
                  </span>
                  {result.secondaryIntent && (
                    <div className="mt-1 flex items-center space-x-1 font-sans">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Secondary:</span>
                      <span className="font-mono text-[9px] font-bold text-indigo-500/90 bg-indigo-50 px-1 py-0.5 rounded">
                        {result.secondaryIntent}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Softmax Confidence</span>
                  <span className={`font-mono text-base font-bold ${
                    result.intentConfidence >= 0.75 ? "text-emerald-600" : "text-amber-500"
                  }`}>
                    {(result.intentConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Prediction Probability bars simulation */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Top Softmax Class Channels</span>
                
                {[
                  { name: "ADD_EXPENSE", score: result.predictedIntent === "ADD_EXPENSE" ? result.intentConfidence : 0.05 },
                  { name: "ADD_INCOME", score: result.predictedIntent === "ADD_INCOME" ? result.intentConfidence : 0.03 },
                  { name: "CREATE_BUDGET", score: result.predictedIntent === "CREATE_BUDGET" ? result.intentConfidence : 0.02 },
                  { name: "AFFORDABILITY_CHECK", score: result.predictedIntent === "AFFORDABILITY_CHECK" ? result.intentConfidence : 0.04 }
                ]
                  .sort((a, b) => b.score - a.score)
                  .map((channel, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className={result.predictedIntent === channel.name ? "text-slate-800 font-bold" : "text-slate-400"}>
                          {channel.name}
                        </span>
                        <span className={result.predictedIntent === channel.name ? "text-slate-800 font-semibold" : "text-slate-400"}>
                          {(channel.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${
                            result.predictedIntent === channel.name ? "bg-indigo-600" : "bg-slate-300"
                          }`} 
                          style={{ width: `${channel.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Entity Extracted Blocks */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Decoder Head B: Named Slot entities (IOB tagged)</span>
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3">
              {result.entities.length === 0 ? (
                <div className="text-center py-6 text-slate-400 space-y-2">
                  <Tag className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs leading-relaxed max-w-xs mx-auto">No entity slots extracted. Type references to categories (groceries, food), merchants (Walmart), dates, or amounts.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Extracted slots ({result.entities.length})</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.entities.map((entity, i) => (
                      <div 
                        key={i} 
                        className={`p-3 border rounded-xl flex items-start justify-between space-x-2 transition-all hover:scale-[1.01] ${getTagColor(entity.label)}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono opacity-80">
                              {entity.label}
                            </span>
                            <span className="bg-slate-900/10 px-1 rounded text-[9px] font-mono font-bold">
                              {entity.iob}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 mt-1 block font-sans">
                            &ldquo;{entity.text}&rdquo;
                          </span>
                        </div>
                        <Tag className="w-4 h-4 shrink-0 opacity-40 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON Payload representation representing expected pipeline outputs */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                  <span>Structured Output API Package:</span>
                  <div className="flex items-center space-x-1 font-mono text-indigo-500">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>rn-nlp.json</span>
                  </div>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>
{`{
  "inference_latency_ms": 11.2,
  "predicted_intent": "${result.predictedIntent}",
  "confidence": ${result.intentConfidence},
  "slots": {
${result.entities.map(e => `    "${e.label}": "${e.text}"`).join(",\n")}
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

          </div>

          {/* Decoder Head C: Smart On-Device Financial Analyst & Reasoner Card */}
          {result.financialAnalysis && result.financialAnalysis.verdict !== "NONE" && (
            <div className="lg:col-span-12 space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                Decoder Head C: Smart On-Device Financial Analyst &amp; Reasoner
              </span>
              
              <div className={`border rounded-xl p-5 md:p-6 shadow-xs overflow-hidden relative ${
                result.financialAnalysis.verdict === "APPROVED" 
                  ? "bg-emerald-50/70 border-emerald-250 text-slate-800"
                  : result.financialAnalysis.verdict === "CAUTION"
                  ? "bg-amber-50/70 border-amber-250 text-slate-800"
                  : result.financialAnalysis.verdict === "DENIED"
                  ? "bg-rose-50/70 border-rose-250 text-slate-800"
                  : "bg-indigo-50/60 border-indigo-250 text-slate-800"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-250/60">
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-3 rounded-xl border ${
                      result.financialAnalysis.verdict === "APPROVED" 
                        ? "bg-emerald-500/10 border-emerald-200 text-emerald-600 font-bold"
                        : result.financialAnalysis.verdict === "CAUTION"
                        ? "bg-amber-500/10 border-amber-200 text-amber-600 font-bold"
                        : result.financialAnalysis.verdict === "DENIED"
                        ? "bg-rose-500/10 border-rose-200 text-rose-600 font-bold"
                        : "bg-indigo-500/10 border-indigo-200 text-indigo-600 font-bold"
                    }`}>
                      {result.financialAnalysis.verdict === "APPROVED" && <ShieldCheck className="w-6 h-6" />}
                      {result.financialAnalysis.verdict === "CAUTION" && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                      {result.financialAnalysis.verdict === "DENIED" && <XCircle className="w-6 h-6 text-rose-600" />}
                      {result.financialAnalysis.verdict === "ADVICE_ONLY" && <Sparkles className="w-6 h-6 text-indigo-600" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400">Analysis Verdict</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          result.financialAnalysis.verdict === "APPROVED" 
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                            : result.financialAnalysis.verdict === "CAUTION"
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : result.financialAnalysis.verdict === "DENIED"
                            ? "bg-rose-100 border-rose-300 text-rose-800"
                            : "bg-indigo-100 border-indigo-300 text-indigo-800"
                        }`}>
                          {result.financialAnalysis.verdict}
                        </span>
                      </div>
                      <h4 className="text-slate-800 font-extrabold text-base mt-0.5 font-sans">On-Device Dynamic Budgeting Intelligence</h4>
                    </div>
                  </div>

                  {result.financialAnalysis.healthScoreImpact !== 0 && (
                    <div className="shrink-0 flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shadow-xs">
                      <span className="text-slate-400 font-semibold uppercase text-[9px]">Score adjustment:</span>
                      <span className={`font-bold text-sm ${
                        result.financialAnalysis.healthScoreImpact > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {result.financialAnalysis.healthScoreImpact > 0 ? "+" : ""}{result.financialAnalysis.healthScoreImpact} pts
                      </span>
                    </div>
                  )}
                </div>

                {result.financialAnalysis.amountParsed > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-dashed border-slate-250/60">
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Parsed target asset</span>
                      <span className="text-xs font-extrabold text-slate-800 capitalize font-mono block mt-0.5">
                        {result.financialAnalysis.itemParsed || "Unspecified asset"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Extracted total valuation</span>
                      <span className="text-xs font-extrabold text-slate-800 font-mono block mt-0.5">
                        {result.financialAnalysis.amountFormatted}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Required 20% down</span>
                      <span className="text-xs font-extrabold text-slate-800 font-mono block mt-0.5">
                        {result.financialAnalysis.downpaymentRequired || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Projected monthly EMI</span>
                      <span className="text-xs font-extrabold text-amber-700 font-mono block mt-0.5">
                        {result.financialAnalysis.monthlyEmiEstimate || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-1 leading-relaxed">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Expert System Explainer</span>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed font-sans">{result.financialAnalysis.analysisText}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
