export const GenerationConfig = {
  SAMPLES_PER_PERMUTATION: 5,
  TARGET_INTENTS: 16,
  TARGET_TASK_TYPES: 12,
  TOTAL_SAMPLES_TARGET: 16 * 12 * 5, 
  OUTPUT_DIR: "./exported_dataset",
  BATCH_SIZE: 50000, // How many items to keep in memory before flushing
};

export type Region = "US" | "UK" | "UAE" | "IN" | "NP" | "AU" | "CA";

export const REGIONS: Region[] = ["US", "UK", "UAE", "IN", "NP", "AU", "CA"];

export const CURRENCY_MAP: Record<Region, { symbol: string, name: string, slang: string[] }> = {
  US: { symbol: '$', name: 'USD', slang: ['bucks', 'greenbacks', 'dollars'] },
  UK: { symbol: '£', name: 'GBP', slang: ['quid', 'pounds', 'sterling'] },
  UAE: { symbol: 'د.إ', name: 'AED', slang: ['dirhams', 'fils'] },
  IN: { symbol: '₹', name: 'INR', slang: ['rupees', 'paisa', 'INR'] },
  NP: { symbol: '₨', name: 'NPR', slang: ['rupees', 'NPR'] },
  AU: { symbol: 'A$', name: 'AUD', slang: ['dollarydoos', 'bucks'] },
  CA: { symbol: 'C$', name: 'CAD', slang: ['loonies', 'toonies'] },
};

export const AMOUNTS = [
  // Precision
  "10.00", "45.50", "120.75", "0.99", "1050.00", "5.25",
  // Western Shorthand
  "10k", "50k", "100k", "1M", "2.5M", "10.5k", "500k",
  // Indian/Nepali Numbering System (Crucial for IN/NP)
  "1.5 lakhs", "10 lakhs", "1 cr", "2.5 crores", "50,000", "1,00,000", "50 paisa",
  // Word-based/Vague
  "five hundred", "ten bucks", "two grand", "a thousand", "fifty cents", 
  "a couple of hundred", "a few thousand", "roughly 500", "nearly 1k",
  // Large/Extreme
  "1000000", "75000", "250", "15", "99",
];

export const DATE_RANGES = {
  RELATIVE: ["today", "yesterday", "last night", "this morning", "tomorrow", "just now", "a few hours ago"],
  MONTHLY: ["this month", "last month", "for June", "in July", "since January", "the current month"],
  WEEKLY: ["last weekend", "on Monday", "every Friday", "this coming Tuesday", "last week"],
  YEARLY: ["for the year", "last fiscal year", "in 2023", "Q1", "Q2", "Q3", "Q4", "annually"],
  VAGUE: ["recently", "a while ago", "back then", "lately"],
};

export const REGIONAL_SLANG: Record<Region, { expensive: string, cheap: string, spent: string, broke: string }> = {
  US: { expensive: "dropped a bag", cheap: "dirt cheap", spent: "blew through", broke: "flat broke" },
  UK: { expensive: "splashed out", cheap: "cheap as chips", spent: "sank", broke: "skint" },
  IN: { expensive: "bahut mehnga", cheap: "sasta", spent: "paisa uda diya", broke: "kangaal" },
  NP: { expensive: "dherai mahango", cheap: "sasto", spent: "kharcha gariyo", broke: "rupee nai chaina" },
  UAE: { expensive: "pricey", cheap: "steal", spent: "spent", broke: "empty pocket" },
  AU: { expensive: "cost an arm and a leg", cheap: "bargain", spent: "forked out", broke: "stoked" },
  CA: { expensive: "cost a fortune eh", cheap: "a steal eh", spent: "dropped a bunch on", broke: "tapped out" }
};

export const CATEGORIES = [
  "food", "dining", "groceries", "rent", "mortgage", "electricity", "water", "internet", 
  "Netflix", "Spotify", "Gym", "Uber", "Amazon", "Shopping", "Clothing", "Medicine", 
  "Hospital", "Education", "Tuition", "Insurance", "Fuel", "Petrol", "Dining out", 
  "Travel", "Flights", "Hotel", "Cinema", "Gaming", "Taxes", "Investment", "SIP"
];

export const FREQUENCIES = [
  "monthly", "weekly", "annually", "every month", "every week", "yearly", "bi-weekly", "each month", "quarterly"
];

export const INTEREST_RATES = [
  "5%", "7.5%", "12% APR", "8% interest rate", "10% per annum", "6.2% fixed", "15% interest"
];

export const STYLE_MODIFIERS: Record<string, { openers: string[], fillers: string[] }> = {
  CONVERSATIONAL: {
    openers: ["Hey so", "You know what", "Actually", "I was thinking", "Quick question,", "By the way", "Listen,"],
    fillers: ["um", "uh", "like", "basically", "sort of", "you know", "I guess"],
  },
  BANKING: {
    openers: ["Regarding the", "Please process", "Notice of", "Reference number", "In accordance with"],
    fillers: ["debit transaction", "ACH credit", "ledger entry", "cleared funds", "settlement"],
  },
  INFORMAL: {
    openers: ["Yo", "Listen", "Omg", "Wait,", "Guess what"],
    fillers: ["lol", "maybe", "idk", "just", "imo", "fr"],
  },
  PROFESSIONAL: {
    openers: ["I would like to", "Please initiate", "Kindly review", "I am writing to report"],
    fillers: ["as per the agreement", "correspondingly", "effective immediately", "per my records"],
  },
  URGENT: {
    openers: ["Help!", "Urgent:", "Quick!", "I need this now", "Wait a second"],
    fillers: ["immediately", "right away", "asap", "emergency"],
  },
  DIRECT: {
    openers: [""],
    fillers: [""],
  }
};

// Derive from the taxonomy so the generator's intent/task lists can never
// drift from the classifier's label space (INTENT_LIST / TASK_TYPE_LIST).
import { INTENT_LIST } from "../taxonomy/intents";
import { TASK_TYPE_LIST } from "../taxonomy/taskTypes";

export const ALL_INTENTS = INTENT_LIST as readonly string[];

export const ALL_TASK_TYPES = TASK_TYPE_LIST as readonly string[];
