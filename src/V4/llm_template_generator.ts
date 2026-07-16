import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { INTENT_TAXONOMY, Intent, SubIntent } from './intent_taxonomy.js';
import { ENTITY_TYPE_LIST } from '../taxonomy/entityTypes.js';

// Setup ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from '@google/genai';

const OUTPUT_FILE = path.join(__dirname, 'llm_templates.json');
const TEMPLATES_PER_INTENT = 20;

// Providers
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const ACTIVE_PROVIDER = GEMINI_API_KEY ? 'gemini' : (OPENAI_API_KEY ? 'openai' : null);

async function generateTemplatesWithGemini(prompt: string): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.9,
            responseMimeType: "application/json",
        }
    });
    
    try {
        const text = response.text || "[]";
        const parsed = JSON.parse(text);
        return Array.isArray(parsed.templates) ? parsed.templates : (Array.isArray(parsed) ? parsed : Object.values(parsed)[0] as string[]);
    } catch (e) {
        console.error("Failed to parse Gemini response", e);
        return [];
    }
}

async function generateTemplatesWithOpenAI(prompt: string): Promise<string[]> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // Using mini to save costs, can be upgraded
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
            response_format: { type: "json_object" }
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API failed: ${response.statusText}`);
    }

    const data = await response.json();
    try {
        const text = data.choices[0].message.content;
        const parsed = JSON.parse(text);
        return Array.isArray(parsed.templates) ? parsed.templates : (Array.isArray(parsed) ? parsed : Object.values(parsed)[0] as string[]);
    } catch (e) {
        console.error("Failed to parse OpenAI response", e);
        return [];
    }
}

async function fetchTemplates(intent: string, taskType: string, count: number): Promise<string[]> {
    const prompt = `
You are an expert NLP data generator for a Personal Finance AI Assistant.
Generate ${count} highly diverse, chaotic, and realistic user utterance TEMPLATES for:
Intent: ${intent}
Task Type: ${taskType}

CRITICAL: You MUST use placeholders instead of real entity values. 
Available placeholders: ${ENTITY_TYPE_LIST.map(e => `{${e.toLowerCase()}}`).join(', ')}

Examples of realistic, messy template queries:
- "I just dropped {amount} {currency} at {merchant} yesterday."
- "Set a hard cap of {amount} a {frequency} for {category}."
- "Should I dump my {amount} bonus into my {liabilitytype} or start a {assettype} SIP?"
- "Log {amount} for {merchant}... wait, no, make it {amount}."
- "Can I survive if I buy an {goalname} on EMI right now, or will my rent bounce?"

Requirements:
- Mix formal, panicked, voice-to-text style, corrections, and slang.
- Do NOT output actual numbers or entity names; strictly use the {placeholder} format for entities.
- Return a JSON object with a single key "templates" that contains an array of strings.
`;

    if (ACTIVE_PROVIDER === 'gemini') {
        return generateTemplatesWithGemini(prompt);
    } else if (ACTIVE_PROVIDER === 'openai') {
        return generateTemplatesWithOpenAI(prompt);
    } else {
        throw new Error("No API key provided. Please set GEMINI_API_KEY or OPENAI_API_KEY in your environment.");
    }
}

async function main() {
    console.log(`🚀 Starting LLM-driven Template Generation using ${ACTIVE_PROVIDER}`);
    
    if (!ACTIVE_PROVIDER) {
        console.error("❌ Aborting: No GEMINI_API_KEY or OPENAI_API_KEY found.");
        process.exit(1);
    }

    let existingData: Record<string, Record<string, string[]>> = {};
    if (fs.existsSync(OUTPUT_FILE)) {
        existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    }

    for (const intentName of Object.keys(INTENT_TAXONOMY)) {
        const intent = intentName as Intent;
        const subIntents = INTENT_TAXONOMY[intent];

        if (!existingData[intent]) {
            existingData[intent] = {};
        }

        for (const task of subIntents) {
            if (existingData[intent][task] && existingData[intent][task].length >= TEMPLATES_PER_INTENT) {
                console.log(`✅ Skipping ${intent} -> ${task}, already have templates.`);
                continue;
            }

            console.log(`Generating ${TEMPLATES_PER_INTENT} templates for ${intent} -> ${task}...`);
            let retries = 0;
            let success = false;
            
            while (!success && retries < 5) {
                try {
                    const templates = await fetchTemplates(intent, task, TEMPLATES_PER_INTENT);
                    if (templates.length > 0) {
                        // Sanitize templates (trim and enforce lowercase placeholders)
                        const sanitized = templates.map(t => 
                            t.trim().replace(/\{([A-Za-z_]+)\}/g, (match, p1) => `{${p1.toLowerCase()}}`)
                        );
                        existingData[intent][task] = Array.from(new Set([...(existingData[intent][task] || []), ...sanitized]));
                        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));
                        console.log(`  Saved ${sanitized.length} templates.`);
                    }
                    success = true;
                } catch (error: any) {
                    retries++;
                    if (retries >= 5) {
                        console.error(`  Error in generation after ${retries} retries:`, error);
                    } else {
                        const backoff = Math.pow(2, retries) * 1000;
                        console.log(`  Rate limited or error. Retrying in ${backoff}ms...`);
                        await new Promise(r => setTimeout(r, backoff));
                    }
                }
            }
            
            // Standard Rate limiting pause between tasks
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    console.log(`✅ Finished LLM template generation! Saved to ${OUTPUT_FILE}`);
}

main().catch(console.error);
