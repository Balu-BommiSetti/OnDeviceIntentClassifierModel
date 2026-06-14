import * as fs from 'fs';
import * as path from 'path';

const inFile = path.join(process.cwd(), 'wealthpilot_train_v4.json');
const outDir = path.join(process.cwd(), 'exported_dataset');
const outFile = path.join(outDir, 'dataset.jsonl');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function generateUnknownSamples(numSamples: number): any[] {
    const unknownUtterances = [
        "hello", "hi there", "good morning", "what's up", "hey",
        "what's the weather today?", "will it rain?", "is it sunny?",
        "tell me a joke", "who is the president?", "what time is it?",
        "how do I reset my password?", "my wifi is slow", "internet is down",
        "what is the meaning of life?", "why is the sky blue?",
        "asdfgh jklqwerty", "xyz123", "blah blah", "test test 123",
        "what is a mutual fund?", "explain compound interest", "what are stocks?",
        "how to cook pasta", "recipe for chicken", "best restaurants near me",
        "book a flight to london", "how far is the moon", "translate to spanish",
        "show me the news", "play some music", "open youtube",
        "call mom", "text john", "set an alarm for 7am", "cancel my alarm",
        "where am I?", "navigate to hospital", "find gas station",
        "what is 5 plus 5", "calculate tip for 50 dollars", "flip a coin",
        "roll a dice", "what day is it", "is tomorrow a holiday"
    ];

    const samples: any[] = [];
    let idCounter = 1;

    for (let i = 0; i < numSamples; i++) {
        const baseText = unknownUtterances[Math.floor(Math.random() * unknownUtterances.length)];
        let text = baseText;
        if (i % 3 === 1) text = text.toUpperCase();
        if (i % 3 === 2) text = text.charAt(0).toUpperCase() + text.slice(1);
        if (i % 4 === 1) text = text + " plz";
        if (i % 4 === 2) text = "uh " + text;
        if (i % 5 === 1) text = text + " today";

        samples.push({
            id: `unk_${idCounter++}`,
            intent: 'UNKNOWN',
            taskType: 'UNKNOWN',
            utterance: text,
            entities: []
        });
    }
    return samples;
}

// Fisher-Yates shuffle
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function main() {
    console.log("Reading V4 dataset...");
    const data = JSON.parse(fs.readFileSync(inFile, 'utf8'));

    const allSamples: any[] = [];
    let count = 0;

    for (const sample of data.samples) {
        const entities: any[] = [];
        if (sample.slots) {
            for (const [k, v] of Object.entries(sample.slots)) {
                entities.push({ type: k, value: String(v) });
            }
        }

        allSamples.push({
            id: `v4_${count++}`,
            intent: sample.intent,
            taskType: sample.subIntent,
            utterance: sample.utterance,
            entities: entities
        });
    }

    console.log("Generating UNKNOWN samples to balance V4...");
    // Generate ~10000 UNKNOWN samples to provide negative examples
    const unknownSamples = generateUnknownSamples(10000);
    allSamples.push(...unknownSamples);

    console.log("Shuffling all samples...");
    shuffleArray(allSamples);

    console.log(`Writing to ${outFile}...`);
    const stream = fs.createWriteStream(outFile);
    for (const item of allSamples) {
        stream.write(JSON.stringify(item) + '\n');
    }
    stream.end();

    console.log(`✅ Converted ${allSamples.length} samples to ${outFile} successfully!`);
}

main().catch(console.error);
