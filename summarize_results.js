import fs from 'fs';
import readline from 'readline';

async function processLineByLine() {
  const fileStream = fs.createReadStream('./src/V3/testResults/nlp_test_results.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let total = 0;
  let errorCount = 0;
  let sumConfidence = 0;
  let intentCounts = {};

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const result = JSON.parse(line);
      total++;
      if (result.error) {
        errorCount++;
        continue;
      }
      sumConfidence += result.confidence || 0;
      const intent = result.intent || 'UNKNOWN';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    } catch (e) {
      console.error('Error parsing line:', e.message);
    }
  }

  console.log(`Total Samples: ${total}`);
  console.log(`Errors: ${errorCount}`);
  if (total - errorCount > 0) {
    console.log(`Average Confidence: ${(sumConfidence / (total - errorCount)).toFixed(4)}`);
  }
  console.log(`Intent Distribution:`, intentCounts);
}

processLineByLine();
