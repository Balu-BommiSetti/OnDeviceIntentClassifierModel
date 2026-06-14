import * as fs from 'fs';
import * as path from 'path';

const ALL_TASK_TYPES = [
  "CREATE", "STATUS", "ANALYSIS", "UPDATE", "DELETE", "SUMMARY", 
  "INSIGHTS", "COMPARISON", "RISK_CHECK", "FORECAST", "WHAT_IF", "EXPLANATION"
];

interface IntentConfig {
    name: string;
    file: string;
    primaryEntity: string;
    secondaryEntity: string;
    actionVerb: string;
    targetNoun: string;
}

const configs: IntentConfig[] = [
    { name: "ADD_EXPENSE", file: "expenseTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "spend on", targetNoun: "expense" },
    { name: "ADD_INCOME", file: "incomeTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "earn from", targetNoun: "income" },
    { name: "INCOME_DECLARATION", file: "incomeTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "declare", targetNoun: "income declaration" },
    { name: "REFUND", file: "incomeTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "get refunded for", targetNoun: "refund" },
    { name: "SPENDING_ANALYSIS", file: "analysisTemplates.ts", primaryEntity: "category", secondaryEntity: "date", actionVerb: "analyze", targetNoun: "spending" },
    { name: "NET_WORTH_CHECK", file: "analysisTemplates.ts", primaryEntity: "category", secondaryEntity: "date", actionVerb: "check", targetNoun: "net worth" },
    { name: "CASHFLOW_WARNING", file: "analysisTemplates.ts", primaryEntity: "category", secondaryEntity: "date", actionVerb: "warn about", targetNoun: "cashflow" },
    { name: "BUDGET_PLANNING", file: "budgetTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "budget for", targetNoun: "budget" },
    { name: "SAVINGS_ADVICE", file: "adviceTemplates.ts", primaryEntity: "category", secondaryEntity: "date", actionVerb: "save on", targetNoun: "savings" },
    { name: "GOAL_PLANNING", file: "goalTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "plan for", targetNoun: "goal" },
    { name: "AFFORDABILITY_CHECK", file: "goalTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "afford", targetNoun: "purchase" },
    { name: "LOAN_ANALYSIS", file: "liabilityTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "analyze", targetNoun: "loan" },
    { name: "DEBT_FREEDOM_ANALYSIS", file: "liabilityTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "clear", targetNoun: "debt" },
    { name: "ADD_LIABILITY", file: "liabilityTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "borrow", targetNoun: "liability" },
    { name: "SIP_VS_PREPAY", file: "investmentTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "invest or prepay", targetNoun: "investment" },
    { name: "ADD_ASSET", file: "investmentTemplates.ts", primaryEntity: "category", secondaryEntity: "amount", actionVerb: "buy", targetNoun: "asset" }
];

const fileMap = new Map<string, IntentConfig[]>();
configs.forEach(c => {
    if (!fileMap.has(c.file)) fileMap.set(c.file, []);
    fileMap.get(c.file)!.push(c);
});

const generateTemplates = (config: IntentConfig) => {
    let result = `\n    case '${config.name}':\n      return {\n`;
    for (const tt of ALL_TASK_TYPES) {
        result += `        '${tt}': [\n`;
        // 5 Archetypes
        result += `          // Direct\n`;
        result += `          { template: "I want to ${config.actionVerb} {${config.secondaryEntity}} on {${config.primaryEntity}}", slots: { ${config.secondaryEntity}: AMOUNTS, ${config.primaryEntity}: CATEGORIES } },\n`;
        result += `          { template: "${tt} my ${config.targetNoun} for {${config.primaryEntity}}", slots: { ${config.primaryEntity}: CATEGORIES } },\n`;
        
        result += `          // Inquiry\n`;
        result += `          { template: "Can you help me ${config.actionVerb} {${config.primaryEntity}}?", slots: { ${config.primaryEntity}: CATEGORIES } },\n`;
        result += `          { template: "How do I ${tt.toLowerCase()} my ${config.targetNoun}?", slots: {} },\n`;
        
        result += `          // Narrative\n`;
        result += `          { template: "I recently noticed my ${config.targetNoun} for {${config.primaryEntity}} is interesting, let's ${tt.toLowerCase()} it", slots: { ${config.primaryEntity}: CATEGORIES } },\n`;
        
        result += `          // Formal\n`;
        result += `          { template: "Please process a ${tt.toLowerCase()} for my ${config.targetNoun}", slots: {} },\n`;
        
        result += `          // Fragmented\n`;
        result += `          { template: "${config.targetNoun} {${config.primaryEntity}} ${tt.toLowerCase()}", slots: { ${config.primaryEntity}: CATEGORIES } },\n`;
        
        result += `        ],\n`;
    }
    result += `      };\n`;
    return result;
}

const targetDir = path.join(__dirname, '../src/templates');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

for (const [filename, intentConfigs] of fileMap.entries()) {
    let content = `import { AMOUNTS, CATEGORIES, DATE_RANGES } from "../config/generationConfig";\n\n`;
    content += `export const get${filename.replace('.ts', 'Templates')} = (intent: string): any => {\n`;
    content += `  switch (intent) {\n`;
    for (const c of intentConfigs) {
        content += generateTemplates(c);
    }
    content += `    default:\n      return {};\n  }\n};\n`;
    
    fs.writeFileSync(path.join(targetDir, filename), content);
    console.log(`Generated ${filename}`);
}
