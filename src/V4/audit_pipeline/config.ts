import * as dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
    // LLM Providers
    PROVIDERS: {
        OPENAI: {
            API_KEY: process.env.OPENAI_API_KEY || '',
            MODEL: 'gpt-4o-mini', // Can be upgraded to gpt-4o
            BASE_URL: 'https://api.openai.com/v1/chat/completions'
        },
        GEMINI: {
            API_KEY: process.env.GEMINI_API_KEY || '',
            // We use round-robin across only the MOST CAPABLE available models.
            // Excluded models that threw 404/429 (Pro/3.0) and "Lite" models.
            MODELS: [
                "gemini-2.5-flash"
            ],
            MODEL: 'gemini-2.5-flash', // Default fallback
            BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
        },
        OLLAMA: {
            API_KEY: process.env.OLLAMA_API_KEY || '',
            MODEL: 'qwen2.5-coder:14b',  // <-- Update this!
            BASE_URL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/api/generate'
        },
        GROQ: { // Cloud hosted Llama/Mistral (Extremely fast)
            API_KEY: process.env.GROQ_API_KEY || '',
            MODEL: 'llama3-70b-8192',
            BASE_URL: 'https://api.groq.com/openai/v1/chat/completions'
        },
        TOGETHER_AI: { // Cloud hosted open source models
            API_KEY: process.env.TOGETHER_API_KEY || '',
            MODEL: 'meta-llama/Llama-3-70b-chat-hf',
            BASE_URL: 'https://api.together.xyz/v1/chat/completions'
        }
    },

    // Choose active provider: 'openai', 'gemini', or 'ollama'
    ACTIVE_PROVIDER: process.env.ACTIVE_PROVIDER || 'gemini',

    // Pipeline settings
    BATCH_SIZE: 50, // How many rows to send to LLM at once
    SAMPLE_SIZE: 2000, // How many rows to sample for the audit. Set to 0 to audit the ENTIRE dataset (124k rows).
    AUTO_RESUME: true, // If true, it automatically skips rows that are already saved in the results file.
    START_ROW: 0, // Manual override to start from a specific row index (overridden by AUTO_RESUME if it finds existing results).

    // File Paths
    DATASET_PATH: '../../../exported_dataset/dataset.jsonl',
    RESULTS_DIR: './results',
    ROW_RESULTS_FILE: './results/row_audit_results.jsonl',
    GLOBAL_REPORT_FILE: './results/global_audit_report.json'
};
