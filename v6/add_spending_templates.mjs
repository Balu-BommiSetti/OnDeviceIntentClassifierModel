import fs from 'fs';

const templatesPath = '/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/templates.json';
const templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));

const summaryTemplates = [
  "how much did i spend in total {DATE}",
  "what's my total expenditure for {DATE}",
  "show me my spendings on {CATEGORY} for {DATE}",
  "can you tell me my total expenses for the {PERIOD}",
  "how much money went towards {CATEGORY} {DATE}",
  "what was my total spend last {PERIOD}",
  "tell me how much i spent on {CATEGORY} in {DATE}",
  "give me the total amount i dropped on {CATEGORY} {DATE}",
  "what's the total for {CATEGORY} {PERIOD}",
  "how much did i spend {PERIOD}",
  "show my total expenses {DATE}",
  "total spending for {DATE}",
  "what is my total spend {PERIOD}",
  "how much did i blow on {CATEGORY} in {DATE}",
  "can i see my total spend for {DATE}",
  "how much have i spent on {CATEGORY} {DATE}",
  "total {CATEGORY} expenses {PERIOD}",
  "show me {CATEGORY} spend for {DATE}",
  "give me my spend summary {PERIOD}",
  "what's my {CATEGORY} spend {DATE}"
];

const analysisTemplates = [
  "what's the breakdown of my spending {DATE}",
  "analyze my spend on {CATEGORY} {PERIOD}",
  "give me spending insights for {DATE}",
  "can you break down my {CATEGORY} expenses for {DATE}",
  "show me a deep dive into my {PERIOD} spending",
  "what did i mostly spend my money on {DATE}",
  "where did my money go {PERIOD}",
  "give me an analysis of my total spend {DATE}",
  "how did i spend my money in {DATE}",
  "show me the category breakdown for {DATE}",
  "analyze my expenses for the {PERIOD}",
  "what is the main category i spent on {DATE}",
  "give me spending breakdown {PERIOD}",
  "show me insights on my {CATEGORY} spend {DATE}",
  "what's my top spend category {DATE}"
];

// Deduplicate and add
if (!templates['SPENDING_ANALYSIS::SUMMARY']) templates['SPENDING_ANALYSIS::SUMMARY'] = [];
summaryTemplates.forEach(t => {
  if (!templates['SPENDING_ANALYSIS::SUMMARY'].includes(t)) {
    templates['SPENDING_ANALYSIS::SUMMARY'].push(t);
  }
});

if (!templates['SPENDING_ANALYSIS::ANALYSIS']) templates['SPENDING_ANALYSIS::ANALYSIS'] = [];
analysisTemplates.forEach(t => {
  if (!templates['SPENDING_ANALYSIS::ANALYSIS'].includes(t)) {
    templates['SPENDING_ANALYSIS::ANALYSIS'].push(t);
  }
});

if (!templates['SPENDING_ANALYSIS::INSIGHTS']) templates['SPENDING_ANALYSIS::INSIGHTS'] = [];
analysisTemplates.forEach(t => {
  if (!templates['SPENDING_ANALYSIS::INSIGHTS'].includes(t)) {
    templates['SPENDING_ANALYSIS::INSIGHTS'].push(t);
  }
});

fs.writeFileSync(templatesPath, JSON.stringify(templates, null, 2));
console.log('Added temporal templates to SPENDING_ANALYSIS');
