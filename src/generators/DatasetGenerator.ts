import fs from "fs";
import { resolveBackendAction } from "../taxonomy/backendActions";
import { ALL_INTENTS, ALL_TASK_TYPES, REGIONS, STYLE_MODIFIERS, GenerationConfig } from "../config/generationConfig";
import { buildFinalUtterance, generatePermutations } from "./UtteranceGenerator";

import { getexpenseTemplates } from "../templates/expenseTemplates";
import { getincomeTemplates } from "../templates/incomeTemplates";
import { getanalysisTemplates } from "../templates/analysisTemplates";
import { getbudgetTemplates } from "../templates/budgetTemplates";
import { getliabilityTemplates } from "../templates/liabilityTemplates";
import { getinvestmentTemplates } from "../templates/investmentTemplates";
import { getgoalTemplates } from "../templates/goalTemplates";
import { getadviceTemplates } from "../templates/adviceTemplates";

function getAllTemplates(intent: string, taskType: string): any[] {
  let map = {};
  switch (intent) {
    case 'ADD_EXPENSE': map = getexpenseTemplates(intent); break;
    case 'ADD_INCOME':
    case 'INCOME_DECLARATION':
    case 'REFUND': map = getincomeTemplates(intent); break;
    case 'SPENDING_ANALYSIS':
    case 'NET_WORTH_CHECK':
    case 'CASHFLOW_WARNING': map = getanalysisTemplates(intent); break;
    case 'BUDGET_PLANNING': map = getbudgetTemplates(intent); break;
    case 'ADD_LIABILITY':
    case 'LOAN_ANALYSIS':
    case 'DEBT_FREEDOM_ANALYSIS': map = getliabilityTemplates(intent); break;
    case 'ADD_ASSET':
    case 'SIP_VS_PREPAY': map = getinvestmentTemplates(intent); break;
    case 'GOAL_PLANNING':
    case 'AFFORDABILITY_CHECK': map = getgoalTemplates(intent); break;
    case 'SAVINGS_ADVICE': map = getadviceTemplates(intent); break;
  }
  return map[taskType] || [];
}

export async function generateDataset() {
  console.log("🚀 Starting Procedural Dataset Generation...");

  if (!fs.existsSync(GenerationConfig.OUTPUT_DIR)) {
    fs.mkdirSync(GenerationConfig.OUTPUT_DIR, { recursive: true });
  }

  const outPath = `${GenerationConfig.OUTPUT_DIR}/dataset.jsonl`;
  const writeStream = fs.createWriteStream(outPath, { flags: 'w' });

  let totalSamplesGenerated = 0;

  for (const intent of ALL_INTENTS) {
    for (const taskType of ALL_TASK_TYPES) {
      console.log(`Generating ${intent} -> ${taskType}...`);
      
      const templates = getAllTemplates(intent, taskType);
      
      if (templates.length === 0) {
        continue;
      }

      // Hack to bypass TypeScript strict checking for backend resolver, as we're dynamically iterating strings
      let backendAction = 'UNKNOWN';
      try {
        backendAction = resolveBackendAction(intent as any, taskType as any);
      } catch (e) {
        // Ignore resolver failures in script context
      }

      for (const sig of templates) {
        const permutations = generatePermutations(sig.slots || {});
        
        for (const perm of permutations) {
          for (const region of REGIONS) {
            for (const style of Object.keys(STYLE_MODIFIERS)) {
              
              const sample = buildFinalUtterance(sig.template, perm, region, style);

              const datasetRecord = {
                id: `${intent}_${taskType}_${totalSamplesGenerated}`,
                intent,
                taskType,
                backendAction,
                utterance: sample.utterance,
                entities: sample.entities,
                style,
                region
              };

              const canWrite = writeStream.write(JSON.stringify(datasetRecord) + "\n");
              totalSamplesGenerated++;
              
              if (!canWrite) {
                await new Promise(resolve => writeStream.once('drain', resolve));
              }
            }
          }
        }
      }
    }
  }

  writeStream.end();
  
  await new Promise((resolve) => writeStream.on('finish', resolve));

  console.log(`✅ Generation Complete! Saved ${totalSamplesGenerated} records to ${outPath}`);
}

// Run the generator
generateDataset().catch(console.error);
