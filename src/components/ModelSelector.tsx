import React, { useState, useMemo } from "react";
import { ModelArchitecture } from "../types";
import { Sliders, Check, AlertTriangle, HelpCircle, Trophy, Battery, Shield, Cpu, RefreshCw, Smartphone } from "lucide-react";

const ARCHITECTURES: ModelArchitecture[] = [
  {
    id: "logistic-regression",
    name: "Logistic Regression (TF-IDF)",
    category: "Traditional",
    accuracy: 62,
    latency: 1.8,
    latencyGPU: 1.8, // GPU not used
    modelSize: 1.2,
    modelSizeQuant: 0.3,
    batteryUsage: 1, // extremely light
    ramUsage: 4,
    pros: ["Extremely low size (<500KB quantized)", "Zero battery/GPU overhead", "Zero startup execution latency"],
    cons: ["Fails on context-aware patterns", "No sequence mapping for slot filling/entities", "Struggles with spelling errors"],
    offlineSuitability: "Excellent. Starts instantly, runs on legacy devices.",
    description: "Traditional text classifier using feature hashing or Bag of Words coupled with binary logistic coefficients. Fits only basic command classifications.",
    isTransformer: false,
  },
  {
    id: "cnn",
    name: "1D CNN Token Classifier",
    category: "Convolutional",
    accuracy: 78,
    latency: 8.5,
    latencyGPU: 4.2,
    modelSize: 4.5,
    modelSizeQuant: 1.1,
    batteryUsage: 3,
    ramUsage: 12,
    pros: ["Extremely fast parallel convolution", "Excellent for keyword context extraction", "Great size-to-accuracy ratio"],
    cons: ["Struggles with long distance dependency matching", "Less granular for entity classification sequence boundaries", "Worse than BiLSTM for entity parsing"],
    offlineSuitability: "Excellent. Fits all devices, negligible battery impact",
    description: "Convolutional filters extract localized n-gram features from embeddings. Highly optimized for parallel CPU/GPU vector math in TF.js.",
    isTransformer: false,
  },
  {
    id: "lstm",
    name: "LSTM (Unidirectional)",
    category: "Recurrent",
    accuracy: 80,
    latency: 18.0,
    latencyGPU: 14.5,
    modelSize: 6.8,
    modelSizeQuant: 1.8,
    batteryUsage: 5,
    ramUsage: 22,
    pros: ["Captures sequential text order and intent dependencies", "Acceptable multi-task execution size", "Can handle simple slot filling"],
    cons: ["Sequential updates limit parallel GPU pipeline benefits", "Struggles to retain backward context for target words", "Slower than CNN, higher computational ceiling"],
    offlineSuitability: "Good. Minor RAM footprint, reasonable fallback.",
    description: "Recurrent structure processing sequence in forward order. Classic choice for sequence parsing prior to deep transformers.",
    isTransformer: false,
  },
  {
    id: "bilstm",
    name: "BiLSTM Neural Sequence Labeler",
    category: "Recurrent",
    accuracy: 88,
    latency: 24.5,
    latencyGPU: 12.2,
    modelSize: 9.4,
    modelSizeQuant: 2.4,
    batteryUsage: 6,
    ramUsage: 34,
    pros: ["Outstanding contextual bidirectional intent framing", "Flawless IOB sequence token classification", "Very small memory footprints (2.4MB quantized)"],
    cons: ["Higher latency on low-end single core mobile CPUs", "More complex TensorFlow.js tensor state management needed", "Moderate battery drain during conversational loops"],
    offlineSuitability: "Outstanding Sweetspot. Delivers near-BERT entity accuracy on 95% of typical mobile inputs.",
    description: "Dual LSTM layers evaluating sequence in forward and backward configurations simultaneously. The production gold-standard for lightweight, offline entity tagging.",
    isTransformer: false,
  },
  {
    id: "distilbert",
    name: "DistilBERT (Generic Model)",
    category: "Transformer",
    accuracy: 94,
    latency: 185.0,
    latencyGPU: 48.0,
    modelSize: 268.0,
    modelSizeQuant: 67.0,
    batteryUsage: 10, // Hot processor!
    ramUsage: 280,
    pros: ["Extreme linguistic understanding", "Excellent out-of-vocabulary (OOV) robustness", "Zero engineering for vocab layout necessary"],
    cons: ["Massive unquantized size (~268MB file chunks)", "Fails completely on budget Android CPUs (>400ms lag)", "High RAM overhead; OS may forcefully terminate React Native thread"],
    offlineSuitability: "Poor. Restricted to flagship desktop or server-backed pipelines, not mobile-friendly.",
    description: "Compact 6-layer distilled variant of BERT. Delivering exceptional accuracy but with massive runtime and offline file size trade-offs.",
    isTransformer: true,
  },
  {
    id: "tinybert",
    name: "TinyBERT (4L 312D - Distilled)",
    category: "Transformer",
    accuracy: 89,
    latency: 68.0,
    latencyGPU: 18.2,
    modelSize: 57.0,
    modelSizeQuant: 14.2,
    batteryUsage: 7,
    ramUsage: 78,
    pros: ["Near BERT accuracy on core intents", "Highly compressed transformer layers", "Natively supported by standard WebGL/ANE GPU layers"],
    cons: ["Worse than BiLSTM at raw on-device battery drain", "14MB storage overhead is still significant for budget users", "Startup/compilation phase can cause UI flutter (~400ms warm-up)"],
    offlineSuitability: "Moderate. Recommended for premium iOS/Android flagship devices with NPU modules.",
    description: "Highly optimized compressed 4-layer transformer distilled specifically into a smaller dimension matrix. Strong balance of modern contextual understanding with manageable bulk.",
    isTransformer: true,
  },
  {
    id: "mobilebert",
    name: "MobileBERT (Compressed Deep Model)",
    category: "Transformer",
    accuracy: 91,
    latency: 90.0,
    latencyGPU: 22.0,
    modelSize: 100.0,
    modelSizeQuant: 25.0,
    batteryUsage: 8,
    ramUsage: 120,
    pros: ["Flawless language structure preservation", "High accuracy on composite complex sentences", "Runs well on modern mobile GPUs"],
    cons: ["Deep layer architecture (24 thin layers) increases execution paths", "25MB asset footprint might trigger over-the-air file limits", "Fails to run on older low-end CPUs without crashes"],
    offlineSuitability: "Moderate-to-Good. Strong for enterprise grade apps targeting flagships.",
    description: "A compressed 24-layer BERT variant leveraging bottleneck structures and extensive target layer distillation. Tailored specifically for high-end mobile engines.",
    isTransformer: true,
  }
];

export function ModelSelector() {
  const [accuracyWeight, setAccuracyWeight] = useState(80);
  const [latencyWeight, setLatencyWeight] = useState(70);
  const [sizeWeight, setSizeWeight] = useState(90);
  const [batteryWeight, setBatteryWeight] = useState(80);

  // Preset Configurations
  const applyPreset = (preset: "budget" | "flagship" | "balanced" | "wearable") => {
    switch (preset) {
      case "budget":
        setAccuracyWeight(40);
        setLatencyWeight(90);
        setSizeWeight(100);
        setBatteryWeight(95);
        break;
      case "flagship":
        setAccuracyWeight(100);
        setLatencyWeight(60);
        setSizeWeight(30);
        setBatteryWeight(40);
        break;
      case "wearable":
        setAccuracyWeight(20);
        setLatencyWeight(95);
        setSizeWeight(100);
        setBatteryWeight(100);
        break;
      case "balanced":
      default:
        setAccuracyWeight(80);
        setLatencyWeight(75);
        setSizeWeight(75);
        setBatteryWeight(70);
        break;
    }
  };

  // Calculate customized recommendation score (out of 100) for each profile
  const scoredArchitectures = useMemo(() => {
    return ARCHITECTURES.map((arch) => {
      // Accuracy score: higher is better
      const accScore = arch.accuracy;
      
      // Latency score: 0ms -> 100 points, 200ms -> 0 points (clamped)
      const latScore = Math.max(0, 100 - (arch.latency / 2));
      
      // Size score: Smaller size -> higher score. 0MB -> 100 points, 100MB -> 0 points (clamped)
      const sizeScore = Math.max(0, 100 - (arch.modelSizeQuant * 1.5));
      
      // Battery score: low battery usage index (1) -> 100 points, high index (10) -> 0 points
      const battScore = (11 - arch.batteryUsage) * 10;

      // Weighted combination
      const totalWeight = accuracyWeight + latencyWeight + sizeWeight + batteryWeight;
      const weightedScore = (
        (accScore * accuracyWeight) +
        (latScore * latencyWeight) +
        (sizeScore * sizeWeight) +
        (battScore * batteryWeight)
      ) / totalWeight;

      return {
        ...arch,
        score: Math.round(weightedScore),
      };
    }).sort((a, b) => b.score - a.score);
  }, [accuracyWeight, latencyWeight, sizeWeight, batteryWeight]);

  const bestChoice = scoredArchitectures[0];

  return (
    <div className="space-y-6">
      
      {/* Priority Sliders Panel */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-slate-800 font-semibold text-lg flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <span>Interactive Decision Matrix &amp; Configurator</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Adjust the weight variables to represent your actual application constraints. The system dynamically re-computes preference coefficients of each model.
            </p>
          </div>
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => applyPreset("balanced")}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Smartphone className="w-3 h-3 text-slate-500" />
              <span>Balanced Mobile</span>
            </button>
            <button 
              onClick={() => applyPreset("budget")}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Cpu className="w-3 h-3 text-emerald-500" />
              <span>Low-End Android</span>
            </button>
            <button 
              onClick={() => applyPreset("flagship")}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Trophy className="w-3 h-3 text-amber-500" />
              <span>Premium iOS NPU</span>
            </button>
            <button 
              onClick={() => applyPreset("wearable")}
              className="px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Battery className="w-3 h-3 text-rose-500" />
              <span>Wearable / Light</span>
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Linguistic Accuracy</span>
              <span className="text-indigo-600 font-mono">{accuracyWeight}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={accuracyWeight} 
              onChange={(e) => setAccuracyWeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] text-slate-400 block leading-tight">High intent confidence &amp; complex vocabulary matching.</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Low CPU Latency</span>
              <span className="text-indigo-600 font-mono">{latencyWeight}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={latencyWeight} 
              onChange={(e) => setLatencyWeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] text-slate-400 block leading-tight">Fast inference (under 30ms) to bypass input delay patterns.</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Low Download Size</span>
              <span className="text-indigo-600 font-mono">{sizeWeight}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={sizeWeight} 
              onChange={(e) => setSizeWeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] text-slate-400 block leading-tight">Minimal network footprint to bundle in app download package.</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Low Battery Drain</span>
              <span className="text-indigo-600 font-mono">{batteryWeight}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={batteryWeight} 
              onChange={(e) => setBatteryWeight(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] text-slate-400 block leading-tight">Low floating-point operations (FLOPs) to protect micro-batteries.</span>
          </div>
        </div>
      </div>

      {/* Recommended Architecture Spotlight */}
      <div className="bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-100 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-mono font-bold uppercase tracking-wider">
              Optimal Arch Selection
            </span>
            <span className="text-xs text-indigo-800 font-semibold font-mono">
              Score: {bestChoice.score}/100
            </span>
          </div>
          <h4 className="text-indigo-950 font-bold text-xl mt-1">
            {bestChoice.name}
          </h4>
          <p className="text-slate-600 text-xs mt-1 max-w-2xl">
            {bestChoice.description} On the current weight metrics, this architecture outperforms constraints with {bestChoice.accuracy}% context F1 score at only {bestChoice.modelSizeQuant}MB quantized size.
          </p>
        </div>
        <div className="shrink-0 flex flex-col space-y-1 text-slate-700">
          <div className="text-xs flex items-center justify-between md:justify-end space-x-2">
            <span className="font-sans text-slate-500">Avg. Mobile Latency:</span>
            <strong className="font-mono text-slate-900">{bestChoice.latency}ms</strong>
          </div>
          <div className="text-xs flex items-center justify-between md:justify-end space-x-2">
            <span className="font-sans text-slate-500">Quantized File Size:</span>
            <strong className="font-mono text-emerald-600">{bestChoice.modelSizeQuant} MB</strong>
          </div>
          <div className="text-xs flex items-center justify-between md:justify-end space-x-2">
            <span className="font-sans text-slate-500">Power Utilization Index:</span>
            <span className="font-mono bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] text-amber-800 font-bold">
              {bestChoice.batteryUsage} / 10
            </span>
          </div>
        </div>
      </div>

      {/* Model List Grid */}
      <div className="space-y-4">
        <h4 className="text-slate-800 font-medium text-sm font-sans">Full Grid Model Comparison Ranking</h4>
        
        <div className="grid grid-cols-1 gap-4">
          {scoredArchitectures.map((arch, idx) => {
            const isWinner = idx === 0;

            return (
              <div 
                key={arch.id} 
                className={`bg-white border rounded-xl overflow-hidden transition-all text-sm ${
                  isWinner 
                    ? "border-indigo-500/80 ring-2 ring-indigo-500/10 shadow-sm" 
                    : "border-slate-200"
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 border-b border-rose-50/5/10">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-700 rounded-full font-mono text-xs font-bold shrink-0">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h5 className="font-bold text-slate-800 font-sans">{arch.name}</h5>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          arch.category === "Transformer" 
                            ? "bg-purple-50 text-purple-700 border-purple-200" 
                            : arch.category === "Recurrent"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : arch.category === "Convolutional"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {arch.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{arch.description}</p>
                    </div>
                  </div>

                  {/* Scoring Badges */}
                  <div className="flex items-center space-x-4 shrink-0 justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block leading-tight font-sans">Recommendation Score</span>
                      <span className={`font-mono text-base font-bold ${
                        isWinner ? "text-indigo-600" : arch.score > 60 ? "text-slate-800" : "text-slate-400"
                      }`}>{arch.score} / 100</span>
                    </div>
                  </div>
                </div>

                {/* Details Tab */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Metric Progress Bars */}
                  <div className="space-y-3 md:col-span-2">
                    {/* Accuracy Slider representation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Linguistic Context (F1)</span>
                        <strong className="text-slate-700 font-mono">{arch.accuracy}%</strong>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full" 
                          style={{ width: `${arch.accuracy}%` }}
                        />
                      </div>
                    </div>

                    {/* Latency metric bar representation (Inverted: shorter is better) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Latency (Unquantized CPU)</span>
                        <strong className="text-slate-700 font-mono">{arch.latency}ms</strong>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        {/* Scale: 0ms -> 100% bar, 300ms+ -> 5% bar */}
                        <div 
                          className="bg-amber-500 h-2 rounded-full" 
                          style={{ width: `${Math.max(5, Math.min(100, 100 - (arch.latency / 3)))}%` }}
                        />
                      </div>
                    </div>

                    {/* Weight representation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">File foot-print (Compressed)</span>
                        <strong className="text-slate-700 font-mono">{arch.modelSizeQuant} MB <span className="text-[10px] text-slate-400 font-normal">({arch.modelSize}MB base)</span></strong>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        {/* Scale: smaller size is better. Over 100MB gets 5% bar */}
                        <div 
                          className="bg-teal-600 h-2 rounded-full" 
                          style={{ width: `${Math.max(5, Math.min(100, 100 - (arch.modelSizeQuant / 2.5)))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pros Section */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase block">Pros</span>
                    <ul className="space-y-1 text-xs">
                      {arch.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-slate-600 leading-tight">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons Section */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold tracking-wider text-rose-700 uppercase block">Cons &amp; Traps</span>
                    <ul className="space-y-1 text-xs">
                      {arch.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="flex items-start space-x-1.5 text-slate-600 leading-tight">
                          <span className="text-rose-500 font-bold shrink-0 mt-0.5 text-xs">&times;</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Offline Rating footer bar */}
                <div className="px-4 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                    <span>RAM Requirement: <strong className="font-mono text-slate-700">{arch.ramUsage} MB</strong></span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-normal">Offline compatibility:</span> <strong className="text-slate-700">{arch.offlineSuitability}</strong>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
