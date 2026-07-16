import * as tf from '@tensorflow/tfjs';
import { RawEntitySpan } from './types';

export class TfjsRunner {
  private model: tf.LayersModel | null = null;
  private word2idx: Record<string, number> = {};
  private idx2intent: Record<number, string> = {};
  private idx2slot: Record<number, string> = {};
  public initialized = false;

  async init() {
    if (this.initialized) return;

    try {
      console.log('Loading TFJS model and vocabularies...');
      
      const vocabRes = await fetch('/model/vocabulary.json');
      const vocabData = await vocabRes.json();
      const vocabList = Array.isArray(vocabData) ? vocabData : (vocabData.vocab || Object.keys(vocabData));
      
      vocabList.forEach((word: string, i: number) => {
        this.word2idx[word] = i;
      });

      const labelsRes = await fetch('/model/labels.json');
      const labels = await labelsRes.json();
      
      for (const [intent, idx] of Object.entries(labels.intent2idx)) {
        this.idx2intent[idx as unknown as number] = intent as string;
      }
      for (const [slot, idx] of Object.entries(labels.slot2idx)) {
        this.idx2slot[idx as unknown as number] = slot as string;
      }

      this.model = await tf.loadLayersModel('/model/model.json');
      this.initialized = true;
      console.log('TFJS Engine initialized successfully!');
    } catch (e) {
      console.error('Failed to init TFJS runner:', e);
      throw e;
    }
  }

  private tokenize(text: string) {
    const clean = text.toLowerCase().replace(/[$₹£€₨]/g, "").replace(/(?<!\d)[.,](?!\d)|[?!]/g, " ");
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    
    const vocabKeys = words.map(w => {
      if (!/\d/.test(w)) return w;
      const digits = w.replace(/[^0-9]/g, "");
      const suffix = w.replace(/[0-9.,]/g, "");
      const hasDec = w.includes(".");
      return `<NUM${digits.length}${hasDec ? 'D' : ''}${suffix}>`;
    });

    return { words, vocabKeys };
  }

  async predict(text: string) {
    if (!this.initialized || !this.model) {
      await this.init();
    }

    const { words, vocabKeys } = this.tokenize(text);
    const seq = new Int32Array(64);
    
    for (let i = 0; i < Math.min(words.length, 64); i++) {
      seq[i] = this.word2idx[vocabKeys[i]] || this.word2idx["<UNK>"];
    }

    const inputTensor = tf.tensor2d(seq, [1, 64], 'int32');
    
    const predictions = this.model!.predict(inputTensor) as tf.Tensor[];
    const intentPred = await predictions[0].data();
    const slotsPred = await predictions[2].array() as number[][][];

    inputTensor.dispose();
    predictions.forEach(p => p.dispose());

    let maxIntentIdx = 0;
    let maxIntentScore = 0;
    for (let i = 0; i < intentPred.length; i++) {
      if (intentPred[i] > maxIntentScore) {
        maxIntentScore = intentPred[i];
        maxIntentIdx = i;
      }
    }
    const predictedIntent = this.idx2intent[maxIntentIdx];

    const rawEntities: any[] = [];
    let currentEntity: any = null;

    for (let i = 0; i < words.length; i++) {
      const slotScores = slotsPred[0][i];
      let maxSlotIdx = 0;
      let maxSlotScore = 0;
      for (let j = 0; j < slotScores.length; j++) {
        if (slotScores[j] > maxSlotScore) {
          maxSlotScore = slotScores[j];
          maxSlotIdx = j;
        }
      }
      const slotLabel = this.idx2slot[maxSlotIdx];
      
      if (slotLabel.startsWith('B-')) {
        if (currentEntity) rawEntities.push(currentEntity);
        currentEntity = {
          type: slotLabel.replace('B-', ''),
          value: words[i],
          iob: slotLabel
        };
      } else if (slotLabel.startsWith('I-') && currentEntity && currentEntity.type === slotLabel.replace('I-', '')) {
        currentEntity.value += ' ' + words[i];
      } else {
        if (currentEntity) {
          rawEntities.push(currentEntity);
          currentEntity = null;
        }
      }
    }
    if (currentEntity) rawEntities.push(currentEntity);

    return {
      predictedIntent,
      intentConfidence: maxIntentScore,
      entities: rawEntities,
      words
    };
  }
}

export const runnerInstance = new TfjsRunner();
