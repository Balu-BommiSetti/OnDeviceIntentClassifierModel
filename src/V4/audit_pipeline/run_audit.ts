import * as fs from 'fs';
import * as path from 'path';
import { runRowAuditPass } from './pass1_row_audit.js';
import { runGlobalAuditPass } from './pass2_dataset_audit.js';
import { exportToCsv } from './export_to_csv.js';
import { CONFIG } from './config.js';

async function main() {
    const args = process.argv.slice(2);
    const fileFlagIdx = args.indexOf('--file');
    
    if (fileFlagIdx !== -1 && args.length > fileFlagIdx + 1) {
        const customFile = path.resolve(process.cwd(), args[fileFlagIdx + 1]);
        CONFIG.DATASET_PATH = customFile;
        const basename = path.basename(customFile, '.jsonl');
        
        // Ensure result files are scoped to this intent/file so they don't overwrite others
        CONFIG.ROW_RESULTS_FILE = `./results/row_audit_results_${basename}.jsonl`;
        CONFIG.GLOBAL_REPORT_FILE = `./results/global_audit_report_${basename}.json`;
    }

    console.log(`Starting Agentic Dataset Review Pipeline...`);
    console.log(`Target Dataset: ${CONFIG.DATASET_PATH}`);
    console.log(`Active Provider: ${CONFIG.ACTIVE_PROVIDER}`);
    console.log(`Sample Size: ${CONFIG.SAMPLE_SIZE === 0 ? 'ALL' : CONFIG.SAMPLE_SIZE}`);
    console.log(`Batch Size: ${CONFIG.BATCH_SIZE}`);
    console.log(`============================================\n`);

    const resultsDir = path.resolve(process.cwd(), 'src/V4/audit_pipeline', CONFIG.RESULTS_DIR);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    console.log(`Results will be written to ${resultsDir}`);

    try {
        await runRowAuditPass();
        console.log("\n");
        await runGlobalAuditPass();
        console.log("\n");

        await exportToCsv();
        console.log("\n");

        console.log("=== PIPELINE FINISHED ===");
        console.log(`Row Audit Results: ${CONFIG.ROW_RESULTS_FILE}`);
        console.log(`Global Report: ${CONFIG.GLOBAL_REPORT_FILE}`);
        
    } catch (e) {
        console.error("Pipeline crashed:", e);
    }
}

main().catch(console.error);
