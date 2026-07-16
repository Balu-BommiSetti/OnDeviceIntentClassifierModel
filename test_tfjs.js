import * as tf from '@tensorflow/tfjs';
import * as fs from 'fs';

// Mock fetch for local file://
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
  if (url.startsWith('file://')) {
    const path = url.replace('file://', '');
    const data = fs.readFileSync(path);
    return {
      ok: true,
      json: async () => JSON.parse(data.toString()),
      arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    };
  }
  return originalFetch(url, options);
};

async function run() {
  const model = await tf.loadLayersModel('file://public/model/model.json');
  const vocabData = JSON.parse(fs.readFileSync('public/model/vocabulary.json', 'utf8'));
  const labelsData = JSON.parse(fs.readFileSync('public/model/labels.json', 'utf8'));
  const word2idx = {};
  vocabData.vocab.forEach((w, i) => word2idx[w] = i);
  
  const text = "log 200 rs on petrol today";
  const words = text.split(" ");
  const seq = new Int32Array(64);
  const vocabKeys = words.map(w => {
      if (!/\d/.test(w)) return w;
      const digits = w.replace(/[^0-9]/g, "");
      const suffix = w.replace(/[0-9.,]/g, "");
      return `<NUM${digits.length}${suffix}>`;
  });
  console.log("vocabKeys:", vocabKeys);
  for (let i = 0; i < words.length; i++) {
    seq[i] = word2idx[vocabKeys[i]] || word2idx["<UNK>"];
  }
  console.log("seq slice:", seq.slice(0, 10));

  const inputTensor = tf.tensor2d(seq, [1, 64], 'int32');
  const preds = model.predict(inputTensor);
  
  const intentData = await preds[0].data();
  console.log("Intent max prob:", Math.max(...intentData), "at index:", intentData.indexOf(Math.max(...intentData)));
  console.log("Intent list:", labelsData.intents[intentData.indexOf(Math.max(...intentData))]);
}
run().catch(console.error);
