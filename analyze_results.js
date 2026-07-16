import fs from 'fs';
import readline from 'readline';

async function analyze() {
  const fileStream = fs.createReadStream('./src/V3/testResults/nlp_test_results.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const stats = {
    total: 0,
    errors: 0,
    intentMatch: 0,
    tfjs: {
      latencySum: 0,
      confidenceSum: 0,
      intents: {},
      taskTypes: {},
      sources: {},
      entityCount: { amount: 0, merchant: 0, category: 0, rawAmount: 0 },
      unknownCount: 0
    },
    legacy: {
      latencySum: 0,
      confidenceSum: 0,
      intents: {},
      entityCount: { amount: 0, merchant: 0, category: 0 },
      unknownCount: 0
    },
    disagreements: []
  };

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      stats.total++;
      if (row.error) {
        stats.errors++;
        continue;
      }

      const l = row.legacy;
      const t = row.tfjs;

      stats.legacy.latencySum += l.latencyMs || 0;
      stats.legacy.confidenceSum += l.confidence || 0;
      stats.legacy.intents[l.intent] = (stats.legacy.intents[l.intent] || 0) + 1;
      if (l.intent === 'UNKNOWN') stats.legacy.unknownCount++;
      if (l.entities?.amount !== null && l.entities?.amount !== undefined) stats.legacy.entityCount.amount++;
      if (l.entities?.merchant) stats.legacy.entityCount.merchant++;
      if (l.entities?.category) stats.legacy.entityCount.category++;

      stats.tfjs.latencySum += t.latencyMs || 0;
      stats.tfjs.confidenceSum += t.confidence || 0;
      stats.tfjs.intents[t.intent] = (stats.tfjs.intents[t.intent] || 0) + 1;
      if (t.intent === 'UNKNOWN') stats.tfjs.unknownCount++;
      
      const tt = t.taskType || 'NONE';
      stats.tfjs.taskTypes[tt] = (stats.tfjs.taskTypes[tt] || 0) + 1;
      
      if (t.sources && t.sources.length) {
        const src = t.sources[0];
        stats.tfjs.sources[src] = (stats.tfjs.sources[src] || 0) + 1;
      }

      if (t.entities?.amount !== null && t.entities?.amount !== undefined) stats.tfjs.entityCount.amount++;
      if (t.entities?.merchant) stats.tfjs.entityCount.merchant++;
      if (t.entities?.rawTfjsEntities?.category) stats.tfjs.entityCount.category++;
      if (t.entities?.rawTfjsEntities?.amount) stats.tfjs.entityCount.rawAmount++;

      if (l.intent === t.intent) {
        stats.intentMatch++;
      } else if (stats.disagreements.length < 20) {
        stats.disagreements.push({
          utterance: row.utterance,
          legacyIntent: l.intent,
          tfjsIntent: t.intent,
          legacyConf: l.confidence,
          tfjsConf: t.confidence
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  const valid = stats.total - stats.errors;
  stats.legacy.avgLatency = stats.legacy.latencySum / valid;
  stats.legacy.avgConfidence = stats.legacy.confidenceSum / valid;
  stats.tfjs.avgLatency = stats.tfjs.latencySum / valid;
  stats.tfjs.avgConfidence = stats.tfjs.confidenceSum / valid;
  stats.intentMatchRate = stats.intentMatch / valid;

  fs.writeFileSync('./src/V3/testResults/analysis_summary.json', JSON.stringify(stats, null, 2));
  console.log('Analysis complete!');
}

analyze();
