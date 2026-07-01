import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { CONFIG } from './config.js';

export async function runAutoFixPass() {
    console.log("=== STARTING PHASE 3: AUTO-FIXING DATASET ===");
    
    const resultsPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.ROW_RESULTS_FILE);
    const originalDatasetPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.DATASET_PATH);
    const fixedDatasetPath = path.resolve(process.cwd(), 'exported_dataset/dataset_fixed.jsonl');
    const manualFixPath = path.resolve(process.cwd(), 'exported_dataset/needs_manual_fix.jsonl');

    if (!fs.existsSync(resultsPath)) {
        console.error(`No audit results found at ${resultsPath}. Cannot auto-fix.`);
        return;
    }
    
    if (!fs.existsSync(originalDatasetPath)) {
        console.error(`Original dataset not found at ${originalDatasetPath}.`);
        return;
    }

    console.log("Loading audit results into memory...");
    const auditMap = new Map<string, any>();
    
    const auditStream = fs.createReadStream(resultsPath);
    const auditRl = readline.createInterface({ input: auditStream, crlfDelay: Infinity });
    
    let loadedCount = 0;
    for await (const line of auditRl) {
        if (!line.trim()) continue;
        try {
            const auditRow = JSON.parse(line);
            if (auditRow.id) {
                auditMap.set(auditRow.id, auditRow);
                loadedCount++;
            }
        } catch (e) {
            console.error("Failed to parse an audit result row:", e);
        }
    }
    console.log(`Loaded ${loadedCount} audited rows.`);

    console.log(`Streaming through original dataset and applying fixes...`);
    const datasetStream = fs.createReadStream(originalDatasetPath);
    const datasetRl = readline.createInterface({ input: datasetStream, crlfDelay: Infinity });
    
    const fixedStream = fs.createWriteStream(fixedDatasetPath);
    const manualStream = fs.createWriteStream(manualFixPath);

    let stats = {
        totalScanned: 0,
        unAuditedPassedThrough: 0,
        dropped: 0,
        routedToManualReview: 0,
        perfectPassedThrough: 0,
        autoFixed: 0
    };

    for await (const line of datasetRl) {
        if (!line.trim()) continue;
        stats.totalScanned++;

        try {
            const row = JSON.parse(line);
            const audit = auditMap.get(row.id);

            // 1. Not audited yet
            if (!audit) {
                fixedStream.write(JSON.stringify(row) + '\n');
                stats.unAuditedPassedThrough++;
                continue;
            }

            // 2. Scheduled for complete deletion
            if (audit.suitability === "DELETE") {
                stats.dropped++;
                continue; // Do not write to any file
            }

            // 3. Needs Manual Fix (Entity or Utterance issues)
            const hasEntityIssue = audit.entityEval?.status && audit.entityEval.status !== "PERFECT";
            const hasUtteranceIssue = audit.utteranceEval?.quality === "LOW";

            if (hasEntityIssue || hasUtteranceIssue) {
                // We can still apply intent/taskType fixes even if it goes to manual review
                if (audit.intentEval?.suggestedIntent) {
                    row.intent = audit.intentEval.suggestedIntent;
                }
                if (audit.taskTypeEval?.suggestedTaskType) {
                    row.taskType = audit.taskTypeEval.suggestedTaskType;
                }
                
                // Also inject the LLM reason into the JSON so the human reviewer knows what to fix!
                row._audit_reason = audit.overallReason;
                if (hasUtteranceIssue) row._suggested_rewrite = audit.utteranceEval.suggestedRewrite;
                
                manualStream.write(JSON.stringify(row) + '\n');
                stats.routedToManualReview++;
                continue; // Do not write to dataset_fixed
            }

            // 4. Auto-Fixable (Only Intent/TaskType issues, or PERFECT)
            let modified = false;
            if (audit.intentEval?.suggestedIntent && audit.intentEval.suggestedIntent !== row.intent) {
                row.intent = audit.intentEval.suggestedIntent;
                modified = true;
            }
            if (audit.taskTypeEval?.suggestedTaskType && audit.taskTypeEval.suggestedTaskType !== row.taskType) {
                row.taskType = audit.taskTypeEval.suggestedTaskType;
                modified = true;
            }

            fixedStream.write(JSON.stringify(row) + '\n');
            if (modified) {
                stats.autoFixed++;
            } else {
                stats.perfectPassedThrough++;
            }

        } catch (e) {
            console.error("Failed to parse a dataset row:", e);
        }
    }

    fixedStream.end();
    manualStream.end();

    console.log("\n=== AUTO-FIX COMPLETE ===");
    console.log(`Total Rows Scanned       : ${stats.totalScanned.toLocaleString()}`);
    console.log(`Unaudited (Passed thru)  : ${stats.unAuditedPassedThrough.toLocaleString()}`);
    console.log(`Perfect (Passed thru)    : ${stats.perfectPassedThrough.toLocaleString()}`);
    console.log(`Auto-Fixed Labels        : ${stats.autoFixed.toLocaleString()}`);
    console.log(`Dropped (Garbage)        : ${stats.dropped.toLocaleString()}`);
    console.log(`Routed to Manual Review  : ${stats.routedToManualReview.toLocaleString()}`);
    console.log(`\nFiles created:`);
    console.log(`- ${fixedDatasetPath} (Your new clean dataset)`);
    console.log(`- ${manualFixPath} (Rows requiring your human review for entity fixes)`);
}

// Allow running standalone
if (process.argv[1] && process.argv[1].endsWith('pass3_auto_fix.ts')) {
    runAutoFixPass().catch(console.error);
}
