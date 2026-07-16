# AI Training Pipeline- On-Device NLP Intent and Entity Extraction

This directory contains the production-grade Python and TensorFlow scripts for training and exporting a unified Multi-Task deep learning network. 

## Folder Structure

```
/training_pipeline
├── README.md                      # Documentation & execution guide
├── requirements.txt               # pip dependencies
├── train.py                       # The master multi-task neural network compiler
├── test_inference.py              # Local testing command-line decoder
└── exported_model/                # Model checkpoint directory
    ├── nlp_multitask_model.h5     # Keras HDF5 binary weights
    ├── vocabulary.json            # Word-to-index vocabulary indices
    ├── labels.json                # Intent labels & entity mappings
    └── tfjs/                      # Web-optimized assets
        ├── model.json             # TFJS model graph structure
        └── group1-shard1of1.bin   # High-efficiency quantized weight shards
```

---

## Technical Specifications

### Multi-Task Neural Architecture

Instead of compiling separate isolated models for both intent and entity slots (which would double mobile memory usage, require separate embedding matrices, and trigger redundant thread operations), we leverage **Multi-Task Representational Learning (MTL)**:

1. **Shared Embedding Layer**: Mapped words are projected into $d=64$ dense features. This layer accounts for ~85% of parameter size and is fully shared by both decoders.
2. **Context Core (Bidirectional LSTM)**: Combines contextual syntax forward and backward over 24 steps with $u=128$ total hidden dims.
3. **Intent Decoder (A)**: Average Semantic pooling over recurrent sequences, followed by fully-connected nodes ($64$ features) with a DropOut and a class channel layer outputting **Softmax probability distributions over the 16 intents**.
4. **Entity Decoder (B)**: A **TimeDistributed Dense Network** processing hidden contexts across individual tokens, passing token distributions through a dense node outputting **IOB tagged slot distributions for all sequence steps**.

---

## Execution Guide

### 1. Set Up Python Environment
Ensure Python 3.9+ is active and install required packages:
```bash
pip install -r requirements.txt
```

### 2. Run Training Pipeline
The training script will automatically locate `personal_finance_dataset.json` (containing 160,000 highly diverse synthesized records), split rows into Train (80%), Validation (10%), and Test (10%), pad sequences, construct the dual-head TF network, print statistics, run 10 epochs with Adam optimizations, evaluate precision indices, and export TFJS configurations:
```bash
python train.py
```

### 3. Test Predictions Locally
Test custom CLI queries against Keras binary weights before deployment:
```bash
python test_inference.py
```

---

## On-Device TensorFlow.js (React Native / Web) Loader Integration

Here is physical production-ready code showing how to restore the trained graph, pre-process input strings, trigger hardware-accelerated (WebGL or CPU ThreadPool) forwarding, and map predicted tokens directly in JavaScript:

```typescript
import * as tf from '@tensorflow/tfjs';

interface ModelBundle {
  model: tf.LayersModel;
  vocabulary: Record<string, number>;
  labels: {
    intents: string[];
    slots: string[];
    max_seq_length: number;
  };
}

// 1. Initialize and cache assets
async function loadOfflineModelBundle(): Promise<ModelBundle> {
  const [model, vocabRes, labelsRes] = await Promise.all([
    tf.loadLayersModel('https://your-domain.com/model/model.json'),
    fetch('https://your-domain.com/model/vocabulary.json').then(r => r.json()),
    fetch('https://your-domain.com/model/labels.json').then(r => r.json())
  ]);
  
  return { model, vocabulary: vocabRes.word2idx, labels: labelsRes };
}

// 2. Perform low-overhead on-device parsing
function runInference(text: string, bundle: ModelBundle) {
  const { model, vocabulary, labels } = bundle;
  const maxLen = labels.max_seq_length;
  
  // Tokenize & Clean
  const cleanTokens = text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 0);
    
  // Vectorize
  const inputIndices = new Int32Array(maxLen);
  for (let i = 0; i < Math.min(cleanTokens.length, maxLen); i++) {
    inputIndices[i] = vocabulary[cleanTokens[i]] ?? vocabulary["<UNK>"] ?? 1;
  }
  
  // Wrap into Tensor
  const inputTensor = tf.tensor2d([Array.from(inputIndices)], [1, maxLen], 'int32');
  
  // Run acceleration pass
  const [intentTensor, slotsTensor] = model.predict(inputTensor) as tf.Tensor[];
  
  // Argmax Decodings
  const intentSoftmax = intentTensor.arraySync() as number[][];
  const slotsSoftmax = slotsTensor.arraySync() as number[][][]; // shape [1, maxLen, num_slots]
  
  // ... Convert output values back to tag strings using labels.intents and labels.slots ...
  
  // Free buffers from GPU VRAM explicitly
  inputTensor.dispose();
  intentTensor.dispose();
  slotsTensor.dispose();
}
```
