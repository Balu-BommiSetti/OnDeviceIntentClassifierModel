#!/usr/bin/env npx ts-node
import fs from 'fs';
import path from 'path';
import { generateSubIntentSamples } from './generate_dataset_v3';
import { Intent, TrainingSample } from './intent_taxonomy';

const INTENTS: Intent[] = [
  "ADD_INCOME", "ADD_EXPENSE", "INCOME_DECLARATION", "ADD_ASSET",
  "ADD_LIABILITY", "REFUND", "AFFORDABILITY_CHECK", "DEBT_FREEDOM_ANALYSIS",
  "SIP_VS_PREPAY", "LOAN_ANALYSIS", "GOAL_PLANNING", "BUDGET_PLANNING",
  "SPENDING_ANALYSIS", "NET_WORTH_CHECK", "CASHFLOW_WARNING", "SAVINGS_ADVICE"
];

function mapSubIntentToTaskType(subIntent: string | null): string {
  if (!subIntent) return 'UNKNOWN';
  switch (subIntent) {
    case 'LOG': case 'REFUND': case 'CASHBACK': case 'REVERSAL':
    case 'MONTHLY_SALARY': case 'ANNUAL': case 'VARIABLE':
    case 'UPDATE_VALUE': case 'UPDATE_BALANCE': case 'SPLIT':
    case 'REIMBURSABLE': case 'RECURRING': case 'MULTIPLE_SOURCES':
    case 'CREATE': // For BUDGET_PLANNING, GOAL_PLANNING
      return 'CREATE';
    case 'SUMMARY': case 'BREAKDOWN': case 'TOTAL':
      return 'SUMMARY';
    case 'QUICK': case 'CHECK': case 'ALERT': case 'CATEGORY_STATUS':
      return 'STATUS';
    case 'PLAN': case 'RECOMMEND': case 'PROJECTION': case 'AUTOMATE':
      return 'FORECAST';
    case 'INSIGHTS': case 'TREND': case 'CATEGORY_DRILL':
    case 'TOP_MERCHANTS': case 'CATEGORY': case 'STRATEGY': case 'HYBRID':
    case 'TIMELINE': case 'AMORTISE': case 'INTEREST_TOTAL':
    case 'EMI_BREAKDOWN': case 'REFI_CHECK': case 'OPTIMISE':
      return 'ANALYSIS';
    case 'COMPARE': case 'BREAKEVEN':
      return 'COMPARISON';
    case 'WHAT_IF': case 'FUTURE_PLAN': case 'EMI_IMPACT':
      return 'WHAT_IF';
    case 'RISK': case 'RISK_CHECK':
      return 'RISK_CHECK';
    case 'CONTRIBUTE': case 'TRACK': case 'ACCELERATE':
      return 'UPDATE';
    case 'GENERAL':
      return 'EXPLANATION';
    default:
      return 'CREATE';
  }
}

function mapSlotToEntityType(slotKey: string): string {
  const mapping: Record<string, string> = {
    amount: 'AMOUNT', category: 'CATEGORY', date: 'DATE', targetDate: 'DATE',
    period: 'DATE', merchant: 'MERCHANT', goalName: 'CATEGORY',
    itemName: 'CATEGORY', loanType: 'CATEGORY', assetType: 'CATEGORY',
    liabilityType: 'CATEGORY', source: 'CATEGORY', salaryAmount: 'AMOUNT',
    extraPayment: 'AMOUNT', surplusAmount: 'AMOUNT', loanAmount: 'AMOUNT',
    splitWith: 'PERSON', currency: 'CURRENCY', frequency: 'FREQUENCY',
    interestRate: 'PERCENTAGE', newRate: 'PERCENTAGE',
    currentSavingsRate: 'PERCENTAGE', targetSavingsRate: 'PERCENTAGE',
    tenureMonths: 'NUMBER', emiNumber: 'NUMBER', loanTenure: 'NUMBER'
  };
  return mapping[slotKey] || slotKey.toUpperCase();
}

function convertSampleToJsonl(sample: any): any {
  const taskType = mapSubIntentToTaskType(sample.subIntent);
  const entities = Object.entries(sample.slots_filled).map(([k, v]) => ({
    type: mapSlotToEntityType(k),
    value: String(v)
  }));
  return {
    id: sample.id,
    intent: sample.intent,
    taskType: taskType,
    utterance: sample.utterance,
    entities: entities
  };
}

function generateMissingTransactionalSamples(): any[] {
  const samples: any[] = [];
  let idCounter = 1;
  const amounts = ["500", "1200", "5000", "15000", "50k", "1.5 lakhs", "$45", "£30"];
  const categories = ["groceries", "fuel", "rent", "dining out", "shopping", "travel"];
  const merchants = ["Amazon", "Uber", "Swiggy", "Tesco", "Zomato"];
  const dates = ["today", "yesterday", "last week", "on Monday"];
  const sources = ["salary", "freelance", "client", "bonus"];
  const assets = ["gold", "mutual funds", "real estate", "stocks"];
  const assetNames = ["Nifty ETF", "Reliance shares", "Bitcoin"];
  const liabilities = ["home loan", "car loan", "personal loan", "credit card"];

  const templates: Record<string, (() => any)[]> = {
    "ADD_INCOME": [
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; const s=sources[Math.floor(Math.random()*sources.length)]; return { u:`Received ${a} from ${s}`, s:{amount:a, source:s}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`Salary credited ${a}`, s:{amount:a}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`I earn ${a} every month`, s:{amount:a, frequency:'monthly'}, t:'CREATE'}; }
    ],
    "ADD_EXPENSE": [
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; const c=categories[Math.floor(Math.random()*categories.length)]; return { u:`Spent ${a} on ${c}`, s:{amount:a, category:c}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; const c=categories[Math.floor(Math.random()*categories.length)]; return { u:`Log ${a} on ${c}`, s:{amount:a, category:c}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; const m=merchants[Math.floor(Math.random()*merchants.length)]; return { u:`Paid ${a} to ${m}`, s:{amount:a, merchant:m}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`just dropped ${a} on new shoes`, s:{amount:a}, t:'CREATE'}; }
    ],
    "INCOME_DECLARATION": [
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`My monthly salary is ${a}`, s:{amount:a, frequency:'monthly'}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`I make ${a} a year`, s:{amount:a, frequency:'annually'}, t:'CREATE'}; }
    ],
    "ADD_ASSET": [
      () => { const a=assets[Math.floor(Math.random()*assets.length)]; const am=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`Bought ${a} worth ${am}`, s:{assetType:a, amount:am}, t:'CREATE'}; },
      () => { const an=assetNames[Math.floor(Math.random()*assetNames.length)]; const am=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`Invested ${am} in ${an}`, s:{assetName:an, amount:am}, t:'CREATE'}; }
    ],
    "ADD_LIABILITY": [
      () => { const l=liabilities[Math.floor(Math.random()*liabilities.length)]; const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`Took a ${l} of ${a}`, s:{liabilityType:l, amount:a}, t:'CREATE'}; },
      () => { const l=liabilities[Math.floor(Math.random()*liabilities.length)]; const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`${l} outstanding is ${a}`, s:{liabilityType:l, amount:a}, t:'STATUS'}; }
    ],
    "REFUND": [
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; const m=merchants[Math.floor(Math.random()*merchants.length)]; return { u:`${m} refunded ${a}`, s:{amount:a, merchant:m}, t:'CREATE'}; },
      () => { const a=amounts[Math.floor(Math.random()*amounts.length)]; return { u:`Got ${a} cashback`, s:{amount:a}, t:'CREATE'}; }
    ]
  };

  for (const intent of Object.keys(templates)) {
    const intentTemplates = templates[intent];
    // Generate ~2000 per intent
    for (let i = 0; i < 2000; i++) {
      const t = intentTemplates[Math.floor(Math.random() * intentTemplates.length)]();
      let u = t.u;
      // Add slight variations
      if (i % 3 === 1) u = u.toLowerCase();
      if (i % 3 === 2) u = u + " today";
      
      const entities = Object.entries(t.s).map(([k, v]) => ({
        type: mapSlotToEntityType(k),
        value: String(v)
      }));
      
      samples.push({
        id: `trans_${intent}_${idCounter++}`,
        intent: intent,
        taskType: t.t,
        utterance: u,
        entities: entities
      });
    }
  }
  return samples;
}

function generateUnknownSamples(): any[] {
  const unknownUtterances = [
    "hello", "hi there", "good morning", "what's up", "hey",
    "what's the weather today?", "will it rain?", "is it sunny?",
    "tell me a joke", "who is the president?", "what time is it?",
    "how do I reset my password?", "my wifi is slow", "internet is down",
    "what is the meaning of life?", "why is the sky blue?",
    "asdfgh jklqwerty", "xyz123", "blah blah", "test test 123",
    "what is a mutual fund?", "explain compound interest", "what are stocks?",
    "how to cook pasta", "recipe for chicken", "best restaurants near me",
    "book a flight to london", "how far is the moon", "translate to spanish"
  ];
  
  const samples: any[] = [];
  let idCounter = 1;
  
  for (const baseText of unknownUtterances) {
    // Generate variations to get ~2000 total
    for (let i = 0; i < 70; i++) {
      let text = baseText;
      if (i % 3 === 1) text = text.toUpperCase();
      if (i % 3 === 2) text = text.charAt(0).toUpperCase() + text.slice(1);
      if (i % 4 === 1) text = text + " plz";
      if (i % 4 === 2) text = "uh " + text;
      
      samples.push({
        id: `unk_${idCounter++}`,
        intent: 'UNKNOWN',
        taskType: 'UNKNOWN',
        utterance: text,
        entities: []
      });
    }
  }
  return samples;
}

// Fisher-Yates shuffle
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

async function main() {
  console.log("Generating dataset from V3 taxonomy...");
  const outDir = path.join(process.cwd(), 'exported_dataset');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const outFile = path.join(outDir, 'dataset.jsonl');
  const stream = fs.createWriteStream(outFile);
  
  let totalSamples = 0;
  const intentCounts: Record<string, number> = {};
  const taskCounts: Record<string, number> = {};
  
  const allSamples: any[] = [];
  
  for (const intent of INTENTS) {
    console.log(`Generating for ${intent}...`);
    try {
      const samples = generateSubIntentSamples(intent, 3000);
      for (const sample of samples) {
        allSamples.push(convertSampleToJsonl(sample));
      }
    } catch (e) {
      console.warn(`Could not generate samples for ${intent}: ${e}`);
    }
  }
  
  console.log("Generating UNKNOWN samples...");
  const unknownSamples = generateUnknownSamples();
  allSamples.push(...unknownSamples);
  
  console.log("Generating missing transactional samples...");
  const transSamples = generateMissingTransactionalSamples();
  allSamples.push(...transSamples);
  
  console.log("Shuffling all samples...");
  shuffleArray(allSamples);
  
  for (const item of allSamples) {
    stream.write(JSON.stringify(item) + '\n');
    totalSamples++;
    intentCounts[item.intent] = (intentCounts[item.intent] || 0) + 1;
    taskCounts[item.taskType] = (taskCounts[item.taskType] || 0) + 1;
  }
  
  stream.end();
  console.log(`\nDataset generation complete! Wrote ${totalSamples} samples to ${outFile}`);
  console.log("\nIntent Distribution:");
  console.log(intentCounts);
  console.log("\nTaskType Distribution:");
  console.log(taskCounts);
  
  fs.writeFileSync(
    path.join(outDir, 'dataset_metadata.json'),
    JSON.stringify({ totalSamples, intentCounts, taskCounts }, null, 2)
  );
}

main().catch(console.error);
