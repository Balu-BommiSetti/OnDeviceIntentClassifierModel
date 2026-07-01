import { CONFIG } from './config.js';

export interface LLMResponse {
    success: boolean;
    data?: any;
    error?: string;
}

// ----------------- HELPERS -----------------
function parseJSON(text: string): any {
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    try {
        return JSON.parse(cleanText);
    } catch (e: any) {
        // If it fails, it might be truncated. Let's provide a helpful snippet.
        const snippet = cleanText.substring(Math.max(0, cleanText.length - 100));
        throw new Error(`JSON Parse Error: ${e.message}. \nSnippet near end (might be truncated): ...${snippet}`);
    }
}

// ----------------- OPENAI COMPATIBLE (OpenAI, Groq, TogetherAI) -----------------
async function callOpenAICompatible(providerName: 'OPENAI' | 'GROQ' | 'TOGETHER_AI', systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const { API_KEY, MODEL, BASE_URL } = CONFIG.PROVIDERS[providerName];
    if (!API_KEY) return { success: false, error: `Missing ${providerName} API Key` };

    try {
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            return { success: false, error: `${providerName} API failed: ${response.statusText} - ${errBody}` };
        }

        const data = await response.json();
        const text = data.choices[0].message.content;
        return { success: true, data: parseJSON(text) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ----------------- GEMINI -----------------
let geminiModelIndex = 0;

async function callGemini(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const { API_KEY, MODEL, BASE_URL } = CONFIG.PROVIDERS.GEMINI;
    // Cast to any to safely access MODELS since it might not be strictly typed yet
    const configGemini = CONFIG.PROVIDERS.GEMINI as any;
    
    if (!API_KEY) return { success: false, error: "Missing Gemini API Key" };

    const modelsToUse = configGemini.MODELS && configGemini.MODELS.length > 0 ? configGemini.MODELS : [MODEL];
    const currentModel = modelsToUse[geminiModelIndex % modelsToUse.length];
    geminiModelIndex++;

    const url = `${BASE_URL}/${currentModel}:generateContent?key=${API_KEY}`;
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [
                    { role: "user", parts: [{ text: userPrompt }] }
                ],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return { success: false, error: `Gemini API failed: ${err}` };
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return { success: true, data: parseJSON(text) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ----------------- OLLAMA -----------------
async function callOllama(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const { MODEL, BASE_URL, API_KEY } = CONFIG.PROVIDERS.OLLAMA;
    try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (API_KEY) {
            headers["Authorization"] = `Bearer ${API_KEY}`;
        }
        
        const response = await fetch(BASE_URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: MODEL,
                prompt: `SYSTEM: ${systemPrompt}\n\nUSER: ${userPrompt}`,
                format: "json",
                stream: false
            })
        });

        if (!response.ok) {
            return { success: false, error: `Ollama API failed: ${response.statusText}` };
        }

        const data = await response.json();
        return { success: true, data: parseJSON(data.response) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ----------------- EXPORT -----------------
export async function askLLM(systemPrompt: string, userPrompt: string): Promise<LLMResponse> {
    const provider = CONFIG.ACTIVE_PROVIDER.toUpperCase();
    
    if (provider === 'OPENAI' || provider === 'GROQ' || provider === 'TOGETHER_AI') {
        return callOpenAICompatible(provider as any, systemPrompt, userPrompt);
    } else if (provider === 'GEMINI') {
        return callGemini(systemPrompt, userPrompt);
    } else if (provider === 'OLLAMA') {
        return callOllama(systemPrompt, userPrompt);
    } else {
        return { success: false, error: `Unknown provider: ${provider}` };
    }
}

// Utility: Exponential backoff wrapper
export async function askLLMWithRetry(systemPrompt: string, userPrompt: string, retries = 3): Promise<LLMResponse> {
    let delay = 2000;
    for (let i = 0; i < retries; i++) {
        const res = await askLLM(systemPrompt, userPrompt);
        if (res.success) return res;
        
        console.warn(`[!] LLM Call failed (Attempt ${i+1}/${retries}): ${res.error}`);
        if (i < retries - 1) {
            console.log(`Retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
        }
    }
    return { success: false, error: "Max retries exceeded" };
}
