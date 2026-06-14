import fs from "fs";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Please set GEMINI_API_KEY environment variable to run the verification script.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

async function verifyDataset() {
  console.log("Loading dataset...");
  const rawData = fs.readFileSync("personal_finance_dataset.json", "utf-8");
  const dataset = JSON.parse(rawData);
  const samples = dataset.samples || dataset;

  // Sample 20 random items
  const evalSamples = [];
  for (let i = 0; i < 20; i++) {
    const idx = Math.floor(Math.random() * samples.length);
    evalSamples.push(samples[idx]);
  }

  console.log(`Evaluating ${evalSamples.length} samples with Gemini...`);

  const results = [];
  let failures = 0;

  for (const sample of evalSamples) {
    const prompt = `
You are an expert NLP data auditor. Review this dataset entry.
Utterance: "${sample.utterance}"
Intent: ${sample.intent}
Entities: ${JSON.stringify(sample.entities_token_iob || sample.entities)}

Is the Intent correct for a personal finance tracker? Are the Entities extracted properly based on our schema?
Respond ONLY with a JSON object in this format: { "status": "PASS" | "FAIL", "reason": "Brief explanation" }`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });
      const resultText = response.text || "{}";
      const parsed = JSON.parse(resultText);
      results.push({ sample, evaluation: parsed });
      if (parsed.status === "FAIL") failures++;
    } catch (err) {
      console.error("Error evaluating sample:", err);
    }
  }

  const report = {
    totalEvaluated: evalSamples.length,
    passed: evalSamples.length - failures,
    failed: failures,
    details: results
  };

  fs.writeFileSync("audit_report.json", JSON.stringify(report, null, 2));
  console.log(`Audit complete. Passed: ${report.passed}, Failed: ${report.failed}. Saved to audit_report.json`);
}

verifyDataset();
