/**
 * NLP Coprocessor Inference Module for React Native
 * 
 * Production-ready on-device NLP inference using TensorFlow.js for React Native.
 * Features:
 * - Optimized tf.tidy() wrappers to prevent iOS/Android memory leak crashes (critical for mobile)
 * - Support for both intents and entities prediction
 * - Fast tokenization and string matching
 * 
 * Dependencies required in your React Native project:
 * - @tensorflow/tfjs
 * - @tensorflow/tfjs-react-native
 * - expo-gl (if using Expo) or react-native-fs (for custom model loading)
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Types
export interface NLPResult {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
}

export interface ModelVocab {
  vocab: string[];
  word2idx: Record<string, number>;
}

export interface ModelLabels {
  intents: string[];
  intent2idx: Record<string, number>;
  slots: string[];
  slot2idx: Record<string, number>;
  max_seq_length: number;
}

export class NLPCoprocessor {
  private model: tf.LayersModel | null = null;
  private vocabRegistry: ModelVocab | null = null;
  private labelRegistry: ModelLabels | null = null;
  private isInitializing: boolean = false;
  private initPromise: Promise<void> | null = null;

  // Confidence ceiling
  private readonly CONFIDENCE_THRESHOLD = 0.65;
  // Fallback intent if confidence is too low
  private readonly UNKNOWN_INTENT = 'UNKNOWN';

  /**
   * Initializes the NLP Engine. Call this when the app starts.
   * Models can be bundled locally using `require()` or hosted remotely.
   */
  public async initialize(
    modelUrl: string | object, 
    vocabData: ModelVocab, 
    labelData: ModelLabels
  ): Promise<void> {
    if (this.model) return;
    
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._initialize(modelUrl, vocabData, labelData);
    return this.initPromise;
  }

  private async _initialize(
    modelUrl: string | object, 
    vocabData: ModelVocab, 
    labelData: ModelLabels
  ): Promise<void> {
    try {
      // 1. Await tfjs backend readiness (critical for React Native WebGL/CPU bindings)
      await tf.ready();
      
      console.log(`[NLP Coprocessor] Backend initialized: ${tf.getBackend()}`);

      // 2. Load the compiled architecture and weights
      // NOTE: In React Native, if loading from local bundle, use bundleResourceIO
      // from @tensorflow/tfjs-react-native
      // e.g., const modelJson = require('./model.json');
      //       const modelWeights = require('./group1-shard1of1.bin');
      //       this.model = await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights));
      this.model = await tf.loadLayersModel(modelUrl as any);

      // 3. Load lookup registries
      this.vocabRegistry = vocabData;
      this.labelRegistry = labelData;

      // 4. Perform GPU warmup to prevent lag on first user interaction
      this.warmup();

      console.log('[NLP Coprocessor] Model loaded and warmed up successfully.');
    } catch (error) {
      console.error('[NLP Coprocessor] Initialization failed:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Run a dummy inference to force WebGL shader compilation upfront.
   * Eliminates the "first query lag" typical in mobile ML apps.
   */
  private warmup() {
    if (!this.model || !this.labelRegistry) return;
    
    // Use tf.tidy to automatically collect memory after warmup
    tf.tidy(() => {
      const dummyInput = tf.zeros([1, this.labelRegistry!.max_seq_length], 'int32');
      this.model!.predict(dummyInput);
    });
  }

  /**
   * Cleans text and tokenizes based on the Python training script logic.
   */
  private cleanTokenize(text: string): string[] {
    const cleaned = text.toLowerCase()
      .replace(/\./g, ' ')
      .replace(/,/g, ' ')
      .replace(/\?/g, ' ')
      .replace(/!/g, ' ');

    return cleaned.split(' ').map(t => t.trim()).filter(t => t.length > 0);
  }

  /**
   * Processes natural language text into actionable structure.
   */
  public async process(text: string): Promise<NLPResult> {
    if (!this.model || !this.vocabRegistry || !this.labelRegistry) {
      throw new Error("NLPCoprocessor is not initialized. Call initialize() first.");
    }

    // Capture standard data bindings
    const { word2idx } = this.vocabRegistry;
    const { intents, slots, max_seq_length } = this.labelRegistry;

    const tokens = this.cleanTokenize(text);
    
    // Create sequence array padded to max length
    const sequence = new Array(max_seq_length).fill(0);
    
    // Map tokens to vocabulary index
    for (let i = 0; i < Math.min(tokens.length, max_seq_length); i++) {
      const token = tokens[i];
      // 1 is <UNK> token if missing
      sequence[i] = word2idx[token] !== undefined ? word2idx[token] : 1; 
    }

    // tf.tidy MUST be used around all tensor operations in React Native,
    // otherwise the app will crash from memory limit exhaustion (OOM).
    const results = tf.tidy(() => {
      const inputTensor = tf.tensor2d([sequence], [1, max_seq_length], 'int32');
      
      // Perform inference (Heads: 0 is Intent, 1 is Slots)
      const predictionWrapper = this.model!.predict(inputTensor) as tf.Tensor[];
      
      const intentPredictions = predictionWrapper[0].dataSync();
      const slotPredictions = predictionWrapper[1]; 
      
      // Argmax logic
      const intentClassId = (predictionWrapper[0].argMax(-1).dataSync())[0];
      const seqClassIds = slotPredictions.argMax(-1).dataSync();
      
      return {
        intentId: intentClassId,
        intentConfidence: intentPredictions[intentClassId],
        seqIds: Array.from(seqClassIds)
      };
    });

    // ---------------------------------------------
    // Post-Processing & Entity Extraction 
    // ---------------------------------------------
    
    // Threshold filtering to prevent hallucinated actions
    let finalIntent = intents[results.intentId];
    if (results.intentConfidence < this.CONFIDENCE_THRESHOLD) {
      finalIntent = this.UNKNOWN_INTENT;
    }

    // Assemble entities from IOB tags
    const entities: Record<string, string> = {};
    let currentEntityLabel: string | null = null;
    let currentEntityBuffer: string[] = [];

    // Parse the TimeDistributed classification output map aligned with tokens
    for (let i = 0; i < Math.min(tokens.length, max_seq_length); i++) {
      const tagId = results.seqIds[i];
      const tagStr = slots[tagId]; 
      
      if (tagStr === "O" || tagStr === "<PAD>" || !tagStr) {
        // Outside entity: commit active buffer if exists
        if (currentEntityLabel && currentEntityBuffer.length > 0) {
          entities[currentEntityLabel] = currentEntityBuffer.join(" ");
          currentEntityLabel = null;
          currentEntityBuffer = [];
        }
        continue;
      }

      // Handle standard "B-" (Begin) and "I-" (Inside) tagging
      if (tagStr.startsWith("B-")) {
        // Commit previous entity
        if (currentEntityLabel && currentEntityBuffer.length > 0) {
          entities[currentEntityLabel] = currentEntityBuffer.join(" ");
        }
        
        currentEntityLabel = tagStr.substring(2); // Remove "B-" OR "I-"
        currentEntityBuffer = [tokens[i]];
      } else if (tagStr.startsWith("I-")) {
        const labelName = tagStr.substring(2);
        
        // Connect to existing buffer if labels match, otherwise treat as new
        if (currentEntityLabel === labelName) {
          currentEntityBuffer.push(tokens[i]);
        } else {
          // Missed the B- tag but we found an I- tag, salvage it
          if (currentEntityLabel && currentEntityBuffer.length > 0) {
            entities[currentEntityLabel] = currentEntityBuffer.join(" ");
          }
          currentEntityLabel = labelName;
          currentEntityBuffer = [tokens[i]];
        }
      }
    }

    // Final sweep at sequence end
    if (currentEntityLabel && currentEntityBuffer.length > 0) {
      entities[currentEntityLabel] = currentEntityBuffer.join(" ");
    }
    
    // Refine some known slots dynamically (e.g. format amounts)
    // Mobile specific: You can add currency symbol parsing or date calculations here.
    if (entities['amount']) {
       const cleanedNumber = entities['amount'].replace(/[^0-9.]/g, '');
       if (cleanedNumber.length > 0) {
          entities['amount'] = cleanedNumber;
       }
    }

    return {
      intent: finalIntent,
      confidence: results.intentConfidence,
      entities: entities
    };
  }
}

export const NLPEngine = new NLPCoprocessor();
