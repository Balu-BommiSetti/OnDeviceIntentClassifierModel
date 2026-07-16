export interface ModelArchitecture {
  id: string;
  name: string;
  category: "Traditional" | "Recurrent" | "Convolutional" | "Transformer";
  accuracy: number;        // scale 1-100
  latency: number;         // in ms (low-end CPU)
  latencyGPU: number;      // in ms (mid-range GPU)
  modelSize: number;       // in MB (uncompressed)
  modelSizeQuant: number;  // in MB (Int8 quantized)
  batteryUsage: number;    // scale 1-10 (1 is best/lowest, 10 is highest/worst drain)
  ramUsage: number;        // in MB
  pros: string[];
  cons: string[];
  offlineSuitability: string;
  description: string;
  isTransformer: boolean;
}

export interface SimulationResult {
  tokens: string[];
  charTokens: string[][];
  predictedIntent: string;
  intentConfidence: number;
  entities: Array<{
    text: string;
    label: string;
    indexRange: [number, number];
    iob: string[];
  }>;
  sentences?: string[];
  secondaryIntent?: string;
  secondaryConfidence?: number;
  financialAnalysis?: {
    itemParsed?: string;
    amountParsed?: number;
    amountFormatted?: string;
    verdict?: "APPROVED" | "CAUTION" | "DENIED" | "ADVICE_ONLY" | "NONE";
    analysisText?: string;
    monthlyEmiEstimate?: string;
    downpaymentRequired?: string;
    healthScoreImpact?: number;
  };
  structuredOutput?: any;
  latency?: number;
  facadeError?: string | null;
}

export interface SystemMetrics {
  sequenceLength: number;
  vocabSize: number;
  embeddingDim: number;
  useQuantization: boolean;
  selectedArchId: string;
  targetDevice: "budget-cpu" | "mid-gpu" | "flagship-npu";
}
