import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import { CONFIG } from './config.js';

/**
 * SHIFT-LEFT AUDIT SCRIPT
 * 
 * Instead of generating 124,000 rows and auditing them,
 * we audit the ~500 raw templates. Once a template is perfect,
 * ALL 250 rows generated from it will be mathematically perfect.
 */

const TEMPLATES_PATH = path.resolve(process.cwd(), 'src/V4/llm_templates.json');
const AUDITED_TEMPLATES_PATH = path.resolve(process.cwd(), 'src/V4/llm_templates_audited.json');

const SYSTEM_PROMPT = `
You are an expert NLP Dataset Architect.
Your job is to audit a template utterance for an Intent Classification and NER dataset.

The template uses placeholders like {amount}, {merchant}.
We need to ensure the template's phrasing perfectly matches the provided Intent and TaskType.

OUTPUT FORMAT:
Strict JSON:
{
    "status": "KEEP" | "MODIFY" | "DELETE",
    "reason": "Explain your decision",
    "suggestedRewrite": "If MODIFY, provide the corrected template string with placeholders intact. Or null if KEEP/DELETE."
}
`;

export async function auditTemplates() {
    console.log("=== STARTING TEMPLATE AUDIT ===");
    
    if (!fs.existsSync(TEMPLATES_PATH)) {
        console.error(`Templates file not found at ${TEMPLATES_PATH}`);
        return;
    }

    const templatesData = JSON.parse(fs.readFileSync(TEMPLATES_PATH, 'utf-8'));
    const auditedData: any = {};
    
    const ai = new GoogleGenAI({ apiKey: CONFIG.PROVIDERS.GEMINI.API_KEY });
    let total = 0, fixed = 0, dropped = 0;

    for (const [intent, taskTypes] of Object.entries(templatesData)) {
        auditedData[intent] = {};
        for (const [taskType, templates] of Object.entries(taskTypes as any)) {
            auditedData[intent][taskType] = [];
            
            for (const template of (templates as string[])) {
                total++;
                console.log(`\nAuditing [${intent} -> ${taskType}]: "${template}"`);
                
                const prompt = `Intent: ${intent}\nTaskType: ${taskType}\nTemplate: ${template}`;
                
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        systemInstruction: SYSTEM_PROMPT,
                        contents: prompt,
                        config: { responseMimeType: "application/json", temperature: 0.1 }
                    });
                    
                    const result = JSON.parse(response.text || "{}");
                    console.log(`Result: ${result.status} - ${result.reason}`);
                    
                    if (result.status === "KEEP") {
                        auditedData[intent][taskType].push(template);
                    } else if (result.status === "MODIFY" && result.suggestedRewrite) {
                        auditedData[intent][taskType].push(result.suggestedRewrite);
                        fixed++;
                    } else {
                        dropped++;
                    }
                } catch (e) {
                    console.error("LLM Call Failed:", e);
                    auditedData[intent][taskType].push(template); // Fallback to original
                }
            }
        }
    }

    fs.writeFileSync(AUDITED_TEMPLATES_PATH, JSON.stringify(auditedData, null, 2));
    console.log("\n=== TEMPLATE AUDIT COMPLETE ===");
    console.log(`Total Templates : ${total}`);
    console.log(`Perfect (Kept)  : ${total - fixed - dropped}`);
    console.log(`Fixed/Rewritten : ${fixed}`);
    console.log(`Dropped         : ${dropped}`);
    console.log(`\nSaved audited templates to: ${AUDITED_TEMPLATES_PATH}`);
}

if (process.argv[1] && process.argv[1].endsWith('audit_templates.ts')) {
    auditTemplates().catch(console.error);
}
