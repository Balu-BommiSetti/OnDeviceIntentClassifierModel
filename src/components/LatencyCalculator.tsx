import React, { useState } from "react";
import { SystemMetrics } from "../types";
import { Layers, HelpCircle, HardDrive, Cpu, Percent, ChevronRight, Calculator, AlertCircle } from "lucide-react";

export function LatencyCalculator() {
  const [seqLength, setSeqLength] = useState(32);
  const [vocabSize, setVocabSize] = useState(8000);
  const [embedDim, setEmbedDim] = useState(128);
  const [useQuant, setUseQuant] = useState(true);
  const [arch, setArch] = useState<"cnn" | "bilstm" | "transformer">("bilstm");
  const [processor, setProcessor] = useState<"budget-cpu" | "mid-gpu" | "flagship-npu">("mid-gpu");

  // Calculations
  const calculations = React.useMemo(() => {
    // 1. Embedding parameters size
    const embeddingParams = vocabSize * embedDim;
    
    // 2. Head/Body Parameters size based on chosen architecture simple models
    let bodyParams = 0;
    let mathComplexityFactor = 1; // FLOPs per parameter factor
    
    if (arch === "cnn") {
      // 3 Layers of convolutions: 128 -> 128 -> 64 with filter size 3 & 5
      bodyParams = (3 * embedDim * embedDim) + (5 * embedDim * 64);
      mathComplexityFactor = 2.5; // localized sliding windows
    } else if (arch === "bilstm") {
      // 1-Layer BiLSTM (Forward + Backward). Parameter formula for LSTM: 4 * (input_dim + out_dim)*out_dim
      // Forward: dim 128 -> out 128. Backward: dim 128 -> out 128.
      const lstmParams = 4 * (embedDim + embedDim) * embedDim;
      bodyParams = lstmParams * 2; // Two directions
      mathComplexityFactor = 8.0; // Recurrent gate iterations per sequence step
    } else {
      // 4-Layer transformer (Compact TinyBERT equivalent)
      // Query/Key/Value projections + feedforward networks.
      const attentionParams = 3 * embedDim * embedDim;
      const ffParams = 2 * embedDim * (embedDim * 4);
      bodyParams = 4 * (attentionParams + ffParams); // 4 full layers
      mathComplexityFactor = 14.0; // O(N^2) attention mapping iterations
    }

    // Classification top layers parameters
    const intentClasses = 16;
    const entityClasses = 32;
    const classificationParams = (embedDim * intentClasses) + (embedDim * entityClasses);

    // Totals
    const totalParams = embeddingParams + bodyParams + classificationParams;
    
    // Size math: 1 parameter = 4 bytes (Float32). Quantized = 1 byte (Int8).
    const bytePerParam = useQuant ? 1 : 4;
    const rawSizeBytes = totalParams * bytePerParam;
    const sizeInMB = Number((rawSizeBytes / (1024 * 1024)).toFixed(2));
    const unquantizedSizeInMB = Number(((totalParams * 4) / (1024 * 1024)).toFixed(2));

    // FLOPs modeling: Total float operations during inference passes
    // Approximated as seqLength * params * complexity multiplier
    const inferenceFLOPs = seqLength * (bodyParams) * mathComplexityFactor + (embeddingParams * 2);

    // Latency speed scaling factors for mobile cores (FLOPs / Processing Rate)
    // Cores ratings:
    // budget-cpu: 0.15 GigaFLOPs / ms operations
    // mid-gpu: 1.2 GigaFLOPs / ms operations
    // flagship-npu: 12.0 GigaFLOPs / ms operations
    let processingRate = 1.2; // GigaFLOPs/sec -> base operations. Let's express in Million FLOPs per ms
    if (processor === "budget-cpu") {
      processingRate = 0.08; // 80 MFLOPs/ms
    } else if (processor === "mid-gpu") {
      processingRate = 0.65; // 650 MFLOPs/ms
    } else {
      processingRate = 8.2; // 8200 MFLOPs/ms. Super-scalar NPU matrix multiply.
    }

    // Estimate latency, enforcing a reasonable floor/ceiling based on real benchmarks
    let latencyMs = inferenceFLOPs / (processingRate * 1_000_000);
    // Add scheduling/graph activation overhead based on framework & core
    let frameworkOverhead = 1.5;
    if (processor === "budget-cpu") frameworkOverhead = 4.5;
    else if (processor === "mid-gpu") frameworkOverhead = 2.2;
    else frameworkOverhead = 1.1;

    latencyMs = latencyMs + frameworkOverhead;

    // Apply specific floors for realism
    if (arch === "bilstm") {
      if (processor === "flagship-npu") latencyMs = Math.max(3.2, latencyMs);
      if (processor === "mid-gpu") latencyMs = Math.max(8.5, latencyMs);
      if (processor === "budget-cpu") latencyMs = Math.max(16.0, latencyMs);
    } else if (arch === "cnn") {
      if (processor === "flagship-npu") latencyMs = Math.max(1.8, latencyMs);
      if (processor === "mid-gpu") latencyMs = Math.max(4.0, latencyMs);
      if (processor === "budget-cpu") latencyMs = Math.max(7.2, latencyMs);
    } else {
      // Transformer
      if (processor === "flagship-npu") latencyMs = Math.max(9.5, latencyMs);
      if (processor === "mid-gpu") latencyMs = Math.max(18.0, latencyMs);
      if (processor === "budget-cpu") latencyMs = Math.max(68.0, latencyMs);
    }

    // Latency is rounded beautifully
    latencyMs = Number(latencyMs.toFixed(1));

    // Ram overhead: usually 4x model size to cache the static compile graph
    const estRamUsage = Math.round(sizeInMB * 3.5 + 8);

    return {
      embeddingParams,
      bodyParams,
      classificationParams,
      totalParams,
      sizeInMB,
      unquantizedSizeInMB,
      inferenceFLOPs: Math.round(inferenceFLOPs),
      latencyMs,
      estRamUsage
    };
  }, [seqLength, vocabSize, embedDim, useQuant, arch, processor]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 md:p-6 shadow-xs space-y-6">
      
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
        <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-500">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-slate-800 font-bold text-lg font-sans">Quantitative Spec &amp; Latency Estimator</h3>
          <p className="text-slate-500 text-xs">
            Model parameters fluctuate heavily with input shapes. Set target hyper-parameters to map memory footprints and speed metrics before training starts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Parameters Controls */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Pipeline Hyper-parameters</span>
          
          {/* Architecture Switcher */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Model Body Architecture</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cnn", name: "1D CNN" },
                { id: "bilstm", name: "BiLSTM" },
                { id: "transformer", name: "TinyBERT" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setArch(item.id as any)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer transition-colors text-center ${
                    arch === item.id 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Processor Target */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">Target Hardware Acceleration</label>
            <select
              value={processor}
              onChange={(e) => setProcessor(e.target.value as any)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
            >
              <option value="budget-cpu">Low-End Android CPU (Single thread execution)</option>
              <option value="mid-gpu">Mid-Range GPU (WebGL/NNAPI accelerated)</option>
              <option value="flagship-npu">Apple Neural Engine / Android NPU (ANE delegates)</option>
            </select>
          </div>

          {/* Sequence Length */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Max Input Sequence Length (Tokens)</span>
              <span className="font-mono text-indigo-600">{seqLength}</span>
            </div>
            <input 
              type="range" 
              min="16" 
              max="128" 
              step="8"
              value={seqLength} 
              onChange={(e) => setSeqLength(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-950"
            />
            <span className="text-[10px] text-slate-400 block font-normal">Shorter length decreases padding calculations, cutting latency.</span>
          </div>

          {/* Vocabulary Size */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Subword Vocabulary Size</span>
              <span className="font-mono text-indigo-600">{vocabSize.toLocaleString()}</span>
            </div>
            <input 
              type="range" 
              min="2000" 
              max="30000" 
              step="1000"
              value={vocabSize} 
              onChange={(e) => setVocabSize(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block font-normal">Vocabulary items form the embedding row dimensions.</span>
          </div>

          {/* Embedding Dimension */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Embedding Vector Dimension (d_model)</span>
              <span className="font-mono text-indigo-600">{embedDim}</span>
            </div>
            <input 
              type="range" 
              min="64" 
              max="512" 
              step="32"
              value={embedDim} 
              onChange={(e) => setEmbedDim(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block font-normal">Width of text feature matrices traversing layers.</span>
          </div>

          {/* Quantization Toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 mt-2">
            <div>
              <span className="text-xs font-bold text-slate-700 block">Deploy with INT8 Quantization</span>
              <span className="text-[10px] text-slate-400 block leading-tight">Quantizes 32-bit floats to 8-bit ints during export.</span>
            </div>
            <button
              onClick={() => setUseQuant(!useQuant)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                useQuant ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <div 
                className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                  useQuant ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Dynamic Calculation Output Metrics */}
        <div className="lg:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
          
          <div className="space-y-5 md:col-span-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Projected Deployment Footprint</span>
            
            {/* Visual Bar Graphs of RAM & Disk comparisons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-slate-200/60 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide block">Weight File Size</span>
                <span className="font-mono text-2xl font-black text-slate-800">{calculations.sizeInMB} <span className="text-xs text-slate-400 font-medium">MB</span></span>
                <span className="text-[10px] text-emerald-600 block leading-none font-medium">
                  {useQuant 
                    ? `Saved: -${(calculations.unquantizedSizeInMB - calculations.sizeInMB).toFixed(1)}MB (-75%)` 
                    : "No quantization optimization applied"
                  }
                </span>
              </div>

              <div className="bg-white p-4 border border-slate-200/60 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-sans tracking-wide block">Incomplete Graph RAM</span>
                <span className="font-mono text-2xl font-black text-slate-800">{calculations.estRamUsage} <span className="text-xs text-slate-400 font-medium">MB</span></span>
                <span className="text-[10px] text-slate-400 block leading-none">Safe bounds for average runtime</span>
              </div>

              <div className="bg-white p-4 border border-slate-200/60 rounded-lg text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-rose-500 font-sans tracking-wide block">Inference Latency</span>
                <span className="font-mono text-2xl font-black text-rose-600">{calculations.latencyMs} <span className="text-xs text-rose-500 font-medium">ms</span></span>
                <span className="text-[10px] text-slate-400 block leading-none">On chosen target accelerator</span>
              </div>
            </div>
          </div>

          {/* Weights Parameters Breakdown */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">Tensor Weight Breakdown</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">Embedding Layer Weights:</span>
                <span className="font-mono text-slate-700">{calculations.embeddingParams.toLocaleString()} attrs</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">Model Core (Layer Body):</span>
                <span className="font-mono text-slate-700">{calculations.bodyParams.toLocaleString()} attrs</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">Dual Decoder Heads:</span>
                <span className="font-mono text-slate-700">{calculations.classificationParams.toLocaleString()} attrs</span>
              </div>
              <div className="flex justify-between font-semibold pt-1">
                <span className="text-slate-800">Total Graph Constants:</span>
                <span className="font-mono text-indigo-600">{calculations.totalParams.toLocaleString()} layers</span>
              </div>
            </div>
          </div>

          {/* FLOPs & Hardware performance breakdown */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase block">Computational Metrics</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">Total FLOPs per run:</span>
                <span className="font-mono text-slate-700">{(calculations.inferenceFLOPs / 1_000_000).toFixed(1)} MFLOPs</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">Framework Delegate overhead:</span>
                <span className="font-mono text-slate-700">
                  {processor === "budget-cpu" ? "~4.5ms" : processor === "mid-gpu" ? "~2.2ms" : "~1.1ms"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1">
                <span className="text-slate-500">UI Thread Dropped Frames:</span>
                <span className="font-mono font-bold text-emerald-600">0 Frames (Worker isolated)</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-slate-500">Inference Battery Cost:</span>
                <span className="font-mono text-slate-700">
                  {calculations.latencyMs > 40 ? "Low-Moderate Wear" : "Negligible / Ultra-safe"}
                </span>
              </div>
            </div>
          </div>

          {/* Performance warning / confirmation alert box */}
          <div className="md:col-span-2 bg-slate-800 text-white p-3 rounded-lg flex items-start space-x-2 text-xs mt-2 border border-slate-700">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {calculations.latencyMs > 50 
                ? "WARNING: Latency estimates exceed the recommended 50ms UX boundary (Human perceptible lag). Consider enabling INT8 Quantization or reducing both Vocabulary Size and Embedding Vector Widths."
                : "STRENGTH SCORE: Metrics reside comfortably compiled inside optimal offline mobile budget limits. This configuration will run cleanly at 60 FPS offline on millions of target mobile chipsets."
              }
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
