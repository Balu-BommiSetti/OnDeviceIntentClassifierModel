import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { CONFIG } from './config.js';
import { ROW_AUDIT_SYSTEM_PROMPT } from './prompts.js';
import { askLLMWithRetry } from './llm_client.js';
import { CSV_COLUMNS, flattenOneRecord, escapeCsvValue } from './export_to_csv.js';

async function processBatch(batch: any[], batchIndex: number, resultsStream: fs.WriteStream, csvStream: fs.WriteStream) {
    console.log(`[Batch ${batchIndex}] Sending ${batch.length} rows to ${CONFIG.ACTIVE_PROVIDER}...`);
    
    // We only send the necessary fields to save tokens
    const simplifiedBatch = batch.map(row => ({
        id: row.id,
        intent: row.intent,
        taskType: row.taskType,
        tokens: row.tokens,
        tags: row.tags
    }));

    const userPrompt = JSON.stringify(simplifiedBatch, null, 2);
    const response = await askLLMWithRetry(ROW_AUDIT_SYSTEM_PROMPT, userPrompt);

    if (!response.success || !response.data || !response.data.results) {
        console.error(`[Batch ${batchIndex}] FAILED. LLM Error:`, response.error);
        return;
    }

    const results = response.data.results;
    for (const res of results) {
        resultsStream.write(JSON.stringify(res) + '\n');
        try {
            const flat = flattenOneRecord(res);
            const csvRow = CSV_COLUMNS.map(col => escapeCsvValue(flat[col]));
            csvStream.write(csvRow.join(',') + '\n');
        } catch(e) {
            console.error("Failed to parse row for CSV:", e);
        }
    }
    console.log(`[Batch ${batchIndex}] SUCCESS. Processed ${results.length} rows.`);
}

export async function runRowAuditPass() {
    console.log("=== STARTING PHASE 1: ROW AUDIT ===");
    
    const dataPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.DATASET_PATH);
    const resultsDir = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.RESULTS_DIR);
    const resultsPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.ROW_RESULTS_FILE);

    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    let skipCount = CONFIG.START_ROW || 0;
    
    if (CONFIG.AUTO_RESUME && fs.existsSync(resultsPath)) {
        // Count lines in the existing results file to know how many we've already processed
        const existingStream = fs.createReadStream(resultsPath);
        const existingRl = readline.createInterface({ input: existingStream, crlfDelay: Infinity });
        let linesCount = 0;
        for await (const _line of existingRl) {
            linesCount++;
        }
        if (linesCount > 0) {
            console.log(`[AUTO-RESUME] Found ${linesCount} previously processed rows. Resuming from there.`);
            skipCount += linesCount;
        }
    }

    if (skipCount > 0) {
        console.log(`Skipping first ${skipCount} rows...`);
    }

    const fileStream = fs.createReadStream(dataPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    const resultsStream = fs.createWriteStream(resultsPath, { flags: 'a' }); // Append mode
    
    const csvPath = path.resolve(process.cwd(), 'src/V4/audit_pipeline/results/summary.csv');
    const csvExists = fs.existsSync(csvPath);
    const csvStream = fs.createWriteStream(csvPath, { flags: 'a' });
    // If the file doesn't exist, or if we are starting from scratch (skipCount 0) but the file was somehow left over
    if (!csvExists || skipCount === 0) {
        // We do not append if we are starting over, we overwrite. 
        // Wait, since we opened in append mode, if skipCount === 0 and the file exists, it will append.
        // Let's rewrite the file entirely if skipCount === 0 to avoid duplicates
        if (skipCount === 0) {
            fs.writeFileSync(csvPath, CSV_COLUMNS.join(',') + '\n');
        } else {
            csvStream.write(CSV_COLUMNS.join(',') + '\n');
        }
    }

    let batch: any[] = [];
    let rowsProcessed = 0; // Relative to this current run
    let totalRowsRead = 0; // Absolute row index in dataset
    let batchIndex = Math.floor(skipCount / CONFIG.BATCH_SIZE) + 1;

    for await (const line of rl) {
        if (!line.trim()) continue;
        
        totalRowsRead++;
        if (totalRowsRead <= skipCount) {
            continue; // Skip already processed rows
        }
        
        try {
            const row = JSON.parse(line);
            batch.push(row);
            rowsProcessed++;

            if (batch.length >= CONFIG.BATCH_SIZE) {
                await processBatch(batch, batchIndex, resultsStream, csvStream);
                batch = [];
                batchIndex++;
            }

            if (CONFIG.SAMPLE_SIZE > 0 && rowsProcessed >= CONFIG.SAMPLE_SIZE) {
                console.log(`Reached requested sample size of ${CONFIG.SAMPLE_SIZE}. Stopping read.`);
                break;
            }
        } catch (e) {
            console.error("Failed to parse JSONL line:", e);
        }
    }

    if (batch.length > 0) {
        await processBatch(batch, batchIndex, resultsStream, csvStream);
    }

    resultsStream.end();
    csvStream.end();
    console.log(`=== PHASE 1 COMPLETE. Results saved to ${CONFIG.ROW_RESULTS_FILE} and summary.csv ===`);
}

// Allow running standalone
if (process.argv[1] && process.argv[1].endsWith('pass1_row_audit.ts')) {
    runRowAuditPass().catch(console.error);
}
