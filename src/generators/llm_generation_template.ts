import * as fs from 'fs';
import * as path from 'path';
import { Intent, INTENT_LIST } from '../taxonomy/intents';
import { TaskType, TASK_TYPE_LIST } from '../taxonomy/taskTypes';

// Configuration
const SAMPLES_PER_COMBINATION = 20000;
const OUTPUT_FILE = path.resolve(__dirname, '../exported_dataset/llm_dataset.jsonl');
const BATCH_SIZE = 50; // How many examples the LLM should generate per API call

/**
 * Replace this with the actual API endpoint and API key provided by the user.
 */
const LLM_API_URL = "https://api.openai.com/v1/chat/completions";
const LLM_API_KEY = process.env.LLM_API_KEY || "YOUR_API_KEY";

async function fetchFromLLM(intent: Intent, taskType: TaskType, count: number): Promise<string[]> {
  const prompt = `
Generate ${count} highly diverse user utterances for a Personal Finance AI Assistant.
Intent: ${intent}
Task Type: ${taskType}

Requirements:
- Make them sound extremely natural.
- Include a mix of formal, informal, panicked, and casual tones.
- Include long queries spanning multiple sentences.
- Include occasional grammar and spelling mistakes (e.g. "rent", "rnt", "hosing", "groceries").
- Use varied currencies (USD, INR, EUR, GBP) and slang for money (bucks, grand, k).
- Return ONLY a valid JSON array of strings, no markdown formatting.
`;

  const response = await fetch(LLM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4-turbo", // Or whatever model is provided
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9
    })
  });

  if (!response.ok) {
    throw new Error(`API failed: ${response.statusText}`);
  }

  const data = await response.json();
  try {
    const text = data.choices[0].message.content;
    const array = JSON.parse(text);
    return Array.isArray(array) ? array : [];
  } catch (e) {
    console.error("Failed to parse LLM response", e);
    return [];
  }
}

async function main() {
  console.log(`🚀 Starting LLM-driven Dataset Generation`);
  const stream = fs.createWriteStream(OUTPUT_FILE, { flags: 'w' });

  for (const intent of INTENT_LIST) {
    for (const task of TASK_TYPE_LIST) {
      console.log(`Generating ${SAMPLES_PER_COMBINATION} samples for ${intent} -> ${task}...`);
      
      let generated = 0;
      while (generated < SAMPLES_PER_COMBINATION) {
        const batchAmount = Math.min(BATCH_SIZE, SAMPLES_PER_COMBINATION - generated);
        
        try {
          const utterances = await fetchFromLLM(intent, task, batchAmount);
          
          for (const text of utterances) {
            // Here you would also extract entities (or prompt the LLM to extract them in the same JSON object!)
            const record = {
              text,
              intent,
              taskType: task,
              entities: [] // This should be populated based on the LLM's response if requested
            };
            stream.write(JSON.stringify(record) + '\\n');
          }
          
          generated += utterances.length;
          console.log(`  Progress: ${generated} / ${SAMPLES_PER_COMBINATION}`);
        } catch (error) {
          console.error(`  Error in batch generation, retrying...`, error);
          await new Promise(r => setTimeout(r, 2000)); // Rate limit backoff
        }
      }
    }
  }

  stream.end();
  console.log(`✅ Finished LLM dataset generation!`);
}

if (require.main === module) {
  main().catch(console.error);
}
