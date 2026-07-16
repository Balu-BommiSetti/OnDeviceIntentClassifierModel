import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { CONFIG } from './config.js';
import { GLOBAL_AUDIT_SYSTEM_PROMPT } from './prompts.js';
import { askLLMWithRetry } from './llm_client.js';

export async function runGlobalAuditPass() {
    console.log("=== STARTING PHASE 2: GLOBAL AUDIT ===");
    
    const dataPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.DATASET_PATH);
    const rowResultsPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.ROW_RESULTS_FILE);
    const globalReportPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.GLOBAL_REPORT_FILE);

    if (!fs.existsSync(rowResultsPath)) {
        console.error(`[!] Cannot run global audit. Missing row results at: ${rowResultsPath}`);
        return;
    }

    console.log("Aggregating statistics from Row Audit pass...");

    const stats = {
        totalRowsEvaluated: 0,
        suitability: { KEEP: 0, MODIFY: 0, DELETE: 0 },
        severity: { NONE: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        entityIssues: { PERFECT: 0, MISSING_ENTITIES: 0, WRONG_BOUNDARIES: 0, WRONG_TAGS: 0 },
        utteranceQuality: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        topSuggestedRewrites: [] as string[]
    };

    const rlRow = readline.createInterface({
        input: fs.createReadStream(rowResultsPath),
        crlfDelay: Infinity
    });

    for await (const line of rlRow) {
        if (!line.trim()) continue;
        try {
            const res = JSON.parse(line);
            stats.totalRowsEvaluated++;
            
            if (res.suitability && stats.suitability[res.suitability as keyof typeof stats.suitability] !== undefined) {
                stats.suitability[res.suitability as keyof typeof stats.suitability]++;
            }
            if (res.severity && stats.severity[res.severity as keyof typeof stats.severity] !== undefined) {
                stats.severity[res.severity as keyof typeof stats.severity]++;
            }
            if (res.entityEval && res.entityEval.status && stats.entityIssues[res.entityEval.status as keyof typeof stats.entityIssues] !== undefined) {
                stats.entityIssues[res.entityEval.status as keyof typeof stats.entityIssues]++;
            }
            if (res.utteranceEval && res.utteranceEval.quality && stats.utteranceQuality[res.utteranceEval.quality as keyof typeof stats.utteranceQuality] !== undefined) {
                stats.utteranceQuality[res.utteranceEval.quality as keyof typeof stats.utteranceQuality]++;
            }
            if (res.utteranceEval && res.utteranceEval.suggestedRewrite && stats.topSuggestedRewrites.length < 50) {
                stats.topSuggestedRewrites.push(res.utteranceEval.suggestedRewrite);
            }
        } catch (e) {
            // ignore bad JSON lines
        }
    }

    console.log("Aggregating basic dataset statistics...");
    const datasetStats = {
        totalSamples: 0,
        intents: {} as Record<string, number>,
        taskTypes: {} as Record<string, number>,
        avgTokens: 0,
        totalTokensCounted: 0
    };

    const rlData = readline.createInterface({
        input: fs.createReadStream(dataPath),
        crlfDelay: Infinity
    });

    let i = 0;
    for await (const line of rlData) {
        if (!line.trim()) continue;
        if (i >= stats.totalRowsEvaluated) break; // Only check stats for the exact number of rows evaluated
        i++;
        
        try {
            const row = JSON.parse(line);
            datasetStats.totalSamples++;
            
            datasetStats.intents[row.intent] = (datasetStats.intents[row.intent] || 0) + 1;
            if (row.taskType) {
                datasetStats.taskTypes[row.taskType] = (datasetStats.taskTypes[row.taskType] || 0) + 1;
            }
            if (row.tokens) {
                datasetStats.totalTokensCounted += row.tokens.length;
            }
        } catch (e) {
            // ignore bad JSON lines
        }
    }
    
    if (datasetStats.totalSamples > 0) {
        datasetStats.avgTokens = datasetStats.totalTokensCounted / datasetStats.totalSamples;
    }

    const payload = {
        datasetStats,
        llmRowAuditStats: stats
    };

    console.log(`Sending global stats to ${CONFIG.ACTIVE_PROVIDER} for final analysis...`);
    const userPrompt = JSON.stringify(payload, null, 2);
    
    const response = await askLLMWithRetry(GLOBAL_AUDIT_SYSTEM_PROMPT, userPrompt);
    
    if (!response.success || !response.data) {
        console.error("Global Audit FAILED. Error:", response.error);
        return;
    }

    fs.writeFileSync(globalReportPath, JSON.stringify(response.data, null, 2));
    console.log(`=== PHASE 2 COMPLETE. Final report saved to ${CONFIG.GLOBAL_REPORT_FILE} ===`);
}

// Allow running standalone
if (process.argv[1] && process.argv[1].endsWith('pass2_dataset_audit.ts')) {
    runGlobalAuditPass().catch(console.error);
}
