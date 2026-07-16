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
import { NumericResolver } from './lib/nlp/resolvers/NumericResolver';
import { TemporalResolver } from './lib/nlp/resolvers/TemporalResolver';
import { TaxonomyResolver } from './lib/nlp/resolvers/TaxonomyResolver';

// Types
export interface NLPResult {
  intent: string;
  confidence: number;
  taskType?: string;
  taskConfidence?: number;
  entities: Record<string, string>;
  boundary?: {
    accepted: boolean;
    nearestIntent: string;
    distance: number;
    radius: number;
  };
  unknownReason?: 'confidence' | 'boundary';
}

export interface ModelVocab {
  vocab: string[];
  word2idx: Record<string, number>;
}

export interface ModelLabels {
  intents: string[];
  intent2idx: Record<string, number>;
  tasks?: string[];
  task2idx?: Record<string, number>;
  slots: string[];
  slot2idx: Record<string, number>;
  max_seq_length: number;
  temperature_scaling?: {
    enabled: boolean;
    temperature: number;
  };
  decision_boundary?: {
    enabled: boolean;
    layer: string;
    metric: 'euclidean';
    centroids: Record<string, number[]>;
    radii: Record<string, number>;
  };
}

export class NLPCoprocessor {
  private model: tf.LayersModel | null = null;
  private embeddingModel: tf.LayersModel | null = null;
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
      this.embeddingModel = this.createEmbeddingModel(this.model);

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

  private createEmbeddingModel(model: tf.LayersModel): tf.LayersModel | null {
    const boundary = this.labelRegistry?.decision_boundary;
    const layerName = boundary?.layer ?? 'intent_dense';

    try {
      const embeddingLayer = model.getLayer(layerName);
      return tf.model({
        inputs: model.inputs,
        outputs: embeddingLayer.output,
      });
    } catch (error) {
      console.warn(`[NLP Coprocessor] Boundary embedding layer unavailable: ${layerName}`, error);
      return null;
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
    const noCurrency = text.toLowerCase().replace(/[$₹£€₨]/g, '');
    const marks: string[] = [];
    const protectedText = noCurrency.replace(/(\d)([.,])(\d)/g, (_m, a, sep, b) => {
      marks.push(sep);
      return `${a}@@DEC${marks.length - 1}@@${b}`;
    });
    const cleaned = protectedText
      .replace(/[.,?!]/g, ' ')
      .replace(/@@DEC(\d+)@@/g, (_m, idx) => marks[Number(idx)]);
    return cleaned.split(' ').map(t => t.trim()).filter(t => t.length > 0);
  }

  private numericVocabKey(token: string): string {
    if (!/\d/.test(token)) return token;
    const digits = token.replace(/[^0-9]/g, '');
    const suffix = token.replace(/[0-9.,]/g, '');
    const hasDecimal = token.includes('.');
    return `<NUM${digits.length}${hasDecimal ? 'D' : ''}${suffix}>`;
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
    const { intents, tasks, slots, max_seq_length } = this.labelRegistry;

    const tokens = this.cleanTokenize(text);
    
    // Create sequence array padded to max length
    const sequence = new Array(max_seq_length).fill(0);
    
    // Map tokens to vocabulary index
    for (let i = 0; i < Math.min(tokens.length, max_seq_length); i++) {
      const token = tokens[i];
      const processedToken = this.numericVocabKey(token);
      // 1 is <UNK> token if missing
      sequence[i] = word2idx[processedToken] !== undefined ? word2idx[processedToken] : 1; 
    }

    // tf.tidy MUST be used around all tensor operations in React Native,
    // otherwise the app will crash from memory limit exhaustion (OOM).
    const results = tf.tidy(() => {
      const inputTensor = tf.tensor2d([sequence], [1, max_seq_length], 'int32');
      
      // Perform inference (Heads: 0 is Intent, 1 is TaskType (optional), 2 is Slots)
      const predictionWrapper = this.model!.predict(inputTensor) as tf.Tensor[];
      const hasTaskHead = predictionWrapper.length > 2;
      
      const intentTensor = predictionWrapper[0];
      const taskTensor = hasTaskHead ? predictionWrapper[1] : null;
      const slotsTensor = hasTaskHead ? predictionWrapper[2] : predictionWrapper[1];
      
      const intentPredictions = Array.from(intentTensor.dataSync());
      const taskPredictions = taskTensor ? Array.from(taskTensor.dataSync()) : [];
      const embedding = this.embeddingModel
        ? Array.from((this.embeddingModel.predict(inputTensor) as tf.Tensor).dataSync())
        : [];
      
      // Argmax logic
      const intentClassId = (intentTensor.argMax(-1).dataSync())[0];
      const taskClassId = taskTensor ? (taskTensor.argMax(-1).dataSync())[0] : -1;
      const seqClassIds = slotsTensor.argMax(-1).dataSync();
      
      return {
        intentId: intentClassId,
        intentPredictions,
        taskId: taskClassId,
        taskPredictions,
        seqIds: Array.from(seqClassIds),
        embedding,
      };
    });

    // ---------------------------------------------
    // Post-Processing & Entity Extraction 
    // ---------------------------------------------
    
    // Threshold filtering to prevent hallucinated actions
    const calibratedIntentScores = this.applyTemperature(results.intentPredictions);
    const calibratedIntentId = this.argmax(calibratedIntentScores);
    const boundaryDecision = this.evaluateDecisionBoundary(results.embedding);

    let finalIntent = intents[calibratedIntentId];
    let unknownReason: NLPResult['unknownReason'] | undefined;
    let intentConfidence = calibratedIntentScores[calibratedIntentId] ?? 0;

    if (boundaryDecision && !boundaryDecision.accepted) {
      finalIntent = this.UNKNOWN_INTENT;
      unknownReason = 'boundary';
    } else if (boundaryDecision?.accepted) {
      finalIntent = boundaryDecision.nearestIntent;
      const boundaryIntentId = this.labelRegistry.intent2idx[finalIntent];
      if (boundaryIntentId !== undefined) {
        intentConfidence = calibratedIntentScores[boundaryIntentId] ?? intentConfidence;
      }
    } else if (intentConfidence < this.CONFIDENCE_THRESHOLD) {
      finalIntent = this.UNKNOWN_INTENT;
      unknownReason = 'confidence';
    }

    const taskConfidence = results.taskId >= 0 ? results.taskPredictions[results.taskId] : undefined;

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
    if (entities['AMOUNT']) {
       const resolved = NumericResolver.resolveAmount(entities['AMOUNT']);
       if (resolved && resolved.value !== null) {
          // Re-map the resolved value back to string for backwards compatibility, or modify NLPResult interface later.
          // Note: Dispatcher currently parses payload as float if possible.
          entities['AMOUNT'] = resolved.value.toString();
       }
    }
    
    if (entities['PERIOD']) {
       const resolved = TemporalResolver.resolvePeriod(entities['PERIOD']);
       if (resolved) entities['PERIOD'] = JSON.stringify(resolved);
    }
    if (entities['DATE']) {
       const resolved = TemporalResolver.resolveDate(entities['DATE']);
       if (resolved) entities['DATE'] = JSON.stringify(resolved);
    }
    if (entities['TIME']) {
       const resolved = TemporalResolver.resolveDate(entities['TIME']);
       if (resolved) entities['TIME'] = JSON.stringify(resolved);
    }
    
    if (entities['EXTRAPAYMENT']) {
       const resolved = NumericResolver.resolveAmount(entities['EXTRAPAYMENT']);
       if (resolved && resolved.value !== null) {
          entities['EXTRAPAYMENT'] = resolved.value.toString();
       }
    }

    return {
      intent: finalIntent,
      confidence: intentConfidence,
      taskType: tasks && results.taskId >= 0 ? tasks[results.taskId] : undefined,
      taskConfidence,
      entities,
      boundary: boundaryDecision,
      unknownReason,
    };
  }

  private applyTemperature(probabilities: number[]): number[] {
    const temperature = this.labelRegistry?.temperature_scaling?.enabled
      ? this.labelRegistry.temperature_scaling.temperature
      : 1.0;

    if (!Number.isFinite(temperature) || temperature <= 0 || temperature === 1.0) {
      return probabilities;
    }

    const logits = probabilities.map((probability) => Math.log(Math.max(probability, 1e-8)) / temperature);
    const maxLogit = Math.max(...logits);
    const exps = logits.map((logit) => Math.exp(logit - maxLogit));
    const total = exps.reduce((sum, value) => sum + value, 0);
    return exps.map((value) => value / total);
  }

  private evaluateDecisionBoundary(embedding: number[]): NLPResult['boundary'] | undefined {
    const boundary = this.labelRegistry?.decision_boundary;
    if (!boundary?.enabled || !embedding.length) return undefined;

    let nearestIntent = this.UNKNOWN_INTENT;
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestRadius = 0;

    for (const [intent, centroid] of Object.entries(boundary.centroids)) {
      if (centroid.length !== embedding.length) continue;

      const distance = this.euclideanDistance(embedding, centroid);
      if (distance < nearestDistance) {
        nearestIntent = intent;
        nearestDistance = distance;
        nearestRadius = boundary.radii[intent] ?? 0;
      }
    }

    if (!Number.isFinite(nearestDistance) || nearestRadius <= 0) return undefined;

    return {
      accepted: nearestDistance <= nearestRadius,
      nearestIntent,
      distance: nearestDistance,
      radius: nearestRadius,
    };
  }

  private euclideanDistance(left: number[], right: number[]): number {
    let sum = 0;
    for (let i = 0; i < left.length; i++) {
      const delta = left[i] - right[i];
      sum += delta * delta;
    }
    return Math.sqrt(sum);
  }

  private argmax(values: number[]): number {
    let bestIdx = 0;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < values.length; i++) {
      if (values[i] > bestValue) {
        bestValue = values[i];
        bestIdx = i;
      }
    }
    return bestIdx;
  }
}

export const NLPEngine = new NLPCoprocessor();
