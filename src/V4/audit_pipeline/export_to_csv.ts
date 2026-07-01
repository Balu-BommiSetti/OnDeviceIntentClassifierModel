import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { CONFIG } from './config';

export const CSV_COLUMNS = [
    "id",
    "intent_status",
    "intent_suggested",
    "intent_reason",
    "task_status",
    "task_suggested",
    "task_reason",
    "entity_status",
    "entity_reason",
    "utter_quality",
    "utter_issues",
    "utter_rewrite",
    "suitability",
    "severity",
    "overall_reason"
];

export function flattenOneRecord(rec: any) {
    const flat: any = {};

    // Top-level fields
    flat["id"] = rec.id || "";
    flat["suitability"] = rec.suitability || "";
    flat["severity"] = rec.severity || "";
    flat["overall_reason"] = rec.overallReason || "";

    // Intent
    const intent = rec.intentEval || {};
    flat["intent_status"] = intent.status || "";
    flat["intent_suggested"] = intent.suggestedIntent || "";
    flat["intent_reason"] = intent.reason || "";

    // Task type
    const task = rec.taskTypeEval || {};
    flat["task_status"] = task.status || "";
    flat["task_suggested"] = task.suggestedTaskType || "";
    flat["task_reason"] = task.reason || "";

    // Entity
    const ent = rec.entityEval || {};
    flat["entity_status"] = ent.status || "";
    flat["entity_reason"] = ent.reason || "";

    // Utterance
    const utt = rec.utteranceEval || {};
    flat["utter_quality"] = utt.quality || "";
    
    const issues = utt.issues;
    if (Array.isArray(issues)) {
        flat["utter_issues"] = issues.join(" | ");
    } else {
        flat["utter_issues"] = "";
    }
    flat["utter_rewrite"] = utt.suggestedRewrite || "";

    return flat;
}

export function escapeCsvValue(val: string): string {
    if (val == null) return "";
    let str = String(val);
    // Escape quotes by doubling them, and wrap in quotes if there's a comma, newline, or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export async function exportToCsv() {
    console.log(`\n=== EXPORTING TO CSV ===`);
    
    const jsonlPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.ROW_RESULTS_FILE);
    const basename = path.basename(CONFIG.ROW_RESULTS_FILE, '.jsonl');
    const csvFilename = basename.startsWith('row_audit_results_') ? `summary_${basename.replace('row_audit_results_', '')}.csv` : 'summary.csv';
    const csvPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline/results', csvFilename);

    if (!fs.existsSync(jsonlPath)) {
        console.log(`No JSONL file found at ${jsonlPath}. Skipping CSV export.`);
        return;
    }

    const writeStream = fs.createWriteStream(csvPath);
    writeStream.write(CSV_COLUMNS.join(',') + '\n');

    const fileStream = fs.createReadStream(jsonlPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
            const rec = JSON.parse(trimmed);
            const flat = flattenOneRecord(rec);
            
            const row = CSV_COLUMNS.map(col => escapeCsvValue(flat[col]));
            writeStream.write(row.join(',') + '\n');
            count++;
        } catch (e: any) {
            console.log(`⚠️  Skipping malformed line: ${e.message}`);
        }
    }

    writeStream.end();
    console.log(`✅  Done - ${count} rows written to ${csvPath}`);
}

// Allow running directly
if (process.argv[1] && process.argv[1].endsWith('export_to_csv.ts')) {
    exportToCsv().catch(console.error);
}
