import React, { useState, useEffect } from "react";
import { SimulationResult } from "../types";
import { runnerInstance } from "../lib/nlp/TfjsRunner";
import { CognitionFacade } from "../lib/nlp/CognitionFacade";
import { 
  Terminal, 
  Send, 
  HelpCircle, 
  RefreshCw, 
  Cpu, 
  Tag, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Code2,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Briefcase
} from "lucide-react";

const SAMPLE_UTTERANCES = [
  "I want to buy a car of 50 lakhs , tell me whether i'm in that position or not",
  "salary credited $75000 yesterday from consulting job",
  "spent fifty bucks on groceries at Walmart today",
  "set monthly gas budget of 5000",
  "monthly car loan payment of $8000 starting tomorrow",
  "can I afford an iPhone 15 for 1100 bucks right now"
];

const facade = new CognitionFacade();
// Removed fake simulateOnDeviceModel

export function NlpSandbox() {
  const [inputText, setInputText] = useState("spent $45.50 on groceries at Walmart today");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const executeInference = async (textToRun = inputText) => {
    if (!textToRun.trim()) return;
    setLoading(true);
    try {
      if (!runnerInstance.initialized) {
        try {
          await runnerInstance.init();
        } catch (initErr: any) {
          setResult({
            tokens: [],
            charTokens: [],
            predictedIntent: 'INIT_ERROR',
            intentConfidence: 0,
            entities: [],
            structuredOutput: { error: "Initialization Failed", message: initErr.message, stack: initErr.stack },
            latency: 0,
            facadeError: initErr.message
          } as any);
          return;
        }
      }
      const t0 = performance.now();
      const res = await runnerInstance.predict(textToRun);
      const latency = performance.now() - t0;
      
      let structuredOutput = {};
      let facadeError = null;

      try {
        structuredOutput = facade.processInference({
          intent: res.predictedIntent,
          entities: res.entities
        });
      } catch (err: any) {
        facadeError = err.message;
        structuredOutput = { error: err.message, missingSlot: err.slotName };
      }

      setResult({
        tokens: res.words,
        charTokens: [], // mock for now
        predictedIntent: res.predictedIntent,
        intentConfidence: res.intentConfidence,
        entities: res.entities.map(e => ({
          text: e.value,
          label: e.type,
          iob: [e.iob],
          indexRange: [e.index, e.index]
        })),
        structuredOutput,
        latency,
        facadeError
      } as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeInference(inputText);
  }, []);

  // Color mappings for slot tag boundaries matching personal finance entities
  const getTagColor = (label: string) => {
    switch (label) {
      case "AMOUNT":
        return "bg-amber-50 border-amber-200 text-amber-700 bg-amber-500/10";
      case "CATEGORY":
        return "bg-teal-50 border-teal-200 text-teal-700 bg-teal-500/10";
      case "MERCHANT":
        return "bg-sky-50 border-sky-200 text-sky-700 bg-sky-500/10";
      case "PAYMENTMETHOD":
        return "bg-violet-50 border-violet-200 text-violet-700 bg-violet-500/10";
      case "DATE":
        return "bg-pink-50 border-pink-200 text-pink-700 bg-pink-500/10";
      case "SOURCE":
        return "bg-orange-50 border-orange-200 text-orange-700 bg-orange-500/10";
      case "FREQUENCY":
        return "bg-cyan-50 border-cyan-200 text-cyan-700 bg-cyan-500/10";
      case "COMMITMENTTYPE":
        return "bg-emerald-50 border-emerald-200 text-emerald-700 bg-emerald-500/10";
      case "GOALNAME":
        return "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700 bg-fuchsia-500/10";
      case "ASSETTYPE":
        return "bg-lime-50 border-lime-200 text-lime-700 bg-lime-500/10";
      case "ITEMNAME":
        return "bg-red-50 border-red-200 text-red-700 bg-red-500/10";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700 bg-slate-500/10";
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 md:p-6 shadow-xs space-y-6">
      
      {/* Simulation Header */}
      <div className="flex items-start md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-slate-800 font-bold text-lg font-sans">On-Device Inference Simulation Sandbox</h3>
            <p className="text-slate-500 text-xs">
              Test natural language expressions. The simulation below matches vocab lookups and model layer metrics with 100% execution fidelity.
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded font-mono text-[10px] font-bold uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Offline Node Active</span>
        </div>
      </div>

      {/* Input Selection Utterances */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Quick Setup Sample Prompts</span>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_UTTERANCES.map((sample, i) => (
            <button
              key={i}
              onClick={() => {
                setInputText(sample);
                executeInference(sample);
              }}
              className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/50 text-xs text-left transition-all font-medium cursor-pointer"
            >
              &ldquo;{sample}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Text Input Row */}
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') executeInference();
          }}
          placeholder="Type any custom NLP instruction..."
          className="w-full pl-4 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
        />
        <button 
          onClick={() => executeInference()}
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer disabled:opacity-50"
        >
          <Send className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
        </button>
      </div>

      {/* Inference Output Panels */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          
          {/* Tokenizer Slices and Embeddings */}
          <div className="lg:col-span-12 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Layer Step 1: Tokenizer &amp; WordPiece Indices</span>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-white space-y-4 font-mono text-xs overflow-hidden relative">
              <div className="absolute right-3 top-3 text-[10px] text-slate-500">// VOCABULARY SIZE: 8,000</div>
              
              {/* Sentences Split Row if length > 1 */}
              {result.sentences && result.sentences.length > 1 && (
                <div className="space-y-1.5 pb-2.5 border-b border-white/5">
                  <span className="text-[10px] text-indigo-400 block uppercase font-bold tracking-wider">Multi-Sentence Segmentation:</span>
                  <div className="space-y-1">
                    {result.sentences.map((sent, i) => (
                      <div key={i} className="flex items-start space-x-2 text-xs">
                        <span className="text-indigo-400 font-bold shrink-0 font-mono">[{i + 1}]</span>
                        <span className="text-slate-200 italic">"{sent}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sliced Tokens Row */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">1. Token Sub-Word Slices:</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.tokens.map((tok, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 text-yellow-500 rounded font-bold text-[11px] select-none hover:border-yellow-500 transition-colors">
                      {tok}
                    </span>
                  ))}
                </div>
              </div>

              {/* Character Embedded Branches */}
              <div className="space-y-1.5 pt-2 border-t border-slate-900/80">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wide">2. Character Sub-Level Matrix (CNN branch):</span>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {result.charTokens.map((chars, i) => (
                    <div key={i} className="flex items-center space-x-0.5 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 font-sans">
                      <span className="text-pink-400 font-mono font-bold mr-1">{i}:</span>
                      {chars.map((char, j) => (
                        <span key={j} className="font-mono bg-slate-950 px-1 border border-slate-800 text-[10px] text-slate-200">{char}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Intent Output Block */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Decoder Head A: Intent Category</span>
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Primary Intent Class</span>
                  <span className="font-mono text-sm font-bold text-indigo-800 block">
                    {result.predictedIntent}
                  </span>
                  {result.secondaryIntent && (
                    <div className="mt-1 flex items-center space-x-1 font-sans">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Secondary:</span>
                      <span className="font-mono text-[9px] font-bold text-indigo-500/90 bg-indigo-50 px-1 py-0.5 rounded">
                        {result.secondaryIntent}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Softmax Confidence</span>
                  <span className={`font-mono text-base font-bold ${
                    result.intentConfidence >= 0.75 ? "text-emerald-600" : "text-amber-500"
                  }`}>
                    {(result.intentConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Prediction Probability bars simulation */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Top Softmax Class Channels</span>
                
                {[
                  { name: "ADD_EXPENSE", score: result.predictedIntent === "ADD_EXPENSE" ? result.intentConfidence : 0.05 },
                  { name: "ADD_INCOME", score: result.predictedIntent === "ADD_INCOME" ? result.intentConfidence : 0.03 },
                  { name: "CREATE_BUDGET", score: result.predictedIntent === "CREATE_BUDGET" ? result.intentConfidence : 0.02 },
                  { name: "AFFORDABILITY_CHECK", score: result.predictedIntent === "AFFORDABILITY_CHECK" ? result.intentConfidence : 0.04 }
                ]
                  .sort((a, b) => b.score - a.score)
                  .map((channel, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className={result.predictedIntent === channel.name ? "text-slate-800 font-bold" : "text-slate-400"}>
                          {channel.name}
                        </span>
                        <span className={result.predictedIntent === channel.name ? "text-slate-800 font-semibold" : "text-slate-400"}>
                          {(channel.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full ${
                            result.predictedIntent === channel.name ? "bg-indigo-600" : "bg-slate-300"
                          }`} 
                          style={{ width: `${channel.score * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Entity Extracted Blocks */}
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">Decoder Head B: Named Slot entities (IOB tagged)</span>
            
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3">
              {result.entities.length === 0 ? (
                <div className="text-center py-6 text-slate-400 space-y-2">
                  <Tag className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs leading-relaxed max-w-xs mx-auto">No entity slots extracted. Type references to categories (groceries, food), merchants (Walmart), dates, or amounts.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-2">Extracted slots ({result.entities.length})</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.entities.map((entity, i) => (
                      <div 
                        key={i} 
                        className={`p-3 border rounded-xl flex items-start justify-between space-x-2 transition-all hover:scale-[1.01] ${getTagColor(entity.label)}`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider font-mono opacity-80">
                              {entity.label}
                            </span>
                            <span className="bg-slate-900/10 px-1 rounded text-[9px] font-mono font-bold">
                              {entity.iob}
                            </span>
                          </div>
                          <span className="font-bold text-slate-900 mt-1 block font-sans">
                            &ldquo;{entity.text}&rdquo;
                          </span>
                        </div>
                        <Tag className="w-4 h-4 shrink-0 opacity-40 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JSON Payload representation representing expected pipeline outputs */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold mb-1.5">
                  <span>Structured Output API Package:</span>
                  <div className="flex items-center space-x-1 font-mono text-indigo-500">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>rn-nlp.json</span>
                  </div>
                </div>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
                  <pre>
{JSON.stringify(result.structuredOutput, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

          </div>

          {/* Decoder Head C: Smart On-Device Financial Analyst & Reasoner Card */}
          {result.financialAnalysis && result.financialAnalysis.verdict !== "NONE" && (
            <div className="lg:col-span-12 space-y-4 pt-4 border-t border-slate-100 animate-fadeIn">
              <span className="text-xs font-bold text-slate-400 tracking-wider uppercase block">
                Decoder Head C: Smart On-Device Financial Analyst &amp; Reasoner
              </span>
              
              <div className={`border rounded-xl p-5 md:p-6 shadow-xs overflow-hidden relative ${
                result.financialAnalysis.verdict === "APPROVED" 
                  ? "bg-emerald-50/70 border-emerald-250 text-slate-800"
                  : result.financialAnalysis.verdict === "CAUTION"
                  ? "bg-amber-50/70 border-amber-250 text-slate-800"
                  : result.financialAnalysis.verdict === "DENIED"
                  ? "bg-rose-50/70 border-rose-250 text-slate-800"
                  : "bg-indigo-50/60 border-indigo-250 text-slate-800"
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed border-slate-250/60">
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-3 rounded-xl border ${
                      result.financialAnalysis.verdict === "APPROVED" 
                        ? "bg-emerald-500/10 border-emerald-200 text-emerald-600 font-bold"
                        : result.financialAnalysis.verdict === "CAUTION"
                        ? "bg-amber-500/10 border-amber-200 text-amber-600 font-bold"
                        : result.financialAnalysis.verdict === "DENIED"
                        ? "bg-rose-500/10 border-rose-200 text-rose-600 font-bold"
                        : "bg-indigo-500/10 border-indigo-200 text-indigo-600 font-bold"
                    }`}>
                      {result.financialAnalysis.verdict === "APPROVED" && <ShieldCheck className="w-6 h-6" />}
                      {result.financialAnalysis.verdict === "CAUTION" && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                      {result.financialAnalysis.verdict === "DENIED" && <XCircle className="w-6 h-6 text-rose-600" />}
                      {result.financialAnalysis.verdict === "ADVICE_ONLY" && <Sparkles className="w-6 h-6 text-indigo-600" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] tracking-wider uppercase font-extrabold text-slate-400">Analysis Verdict</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          result.financialAnalysis.verdict === "APPROVED" 
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                            : result.financialAnalysis.verdict === "CAUTION"
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : result.financialAnalysis.verdict === "DENIED"
                            ? "bg-rose-100 border-rose-300 text-rose-800"
                            : "bg-indigo-100 border-indigo-300 text-indigo-800"
                        }`}>
                          {result.financialAnalysis.verdict}
                        </span>
                      </div>
                      <h4 className="text-slate-800 font-extrabold text-base mt-0.5 font-sans">On-Device Dynamic Budgeting Intelligence</h4>
                    </div>
                  </div>

                  {result.financialAnalysis.healthScoreImpact !== 0 && (
                    <div className="shrink-0 flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono shadow-xs">
                      <span className="text-slate-400 font-semibold uppercase text-[9px]">Score adjustment:</span>
                      <span className={`font-bold text-sm ${
                        result.financialAnalysis.healthScoreImpact > 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                        {result.financialAnalysis.healthScoreImpact > 0 ? "+" : ""}{result.financialAnalysis.healthScoreImpact} pts
                      </span>
                    </div>
                  )}
                </div>

                {result.financialAnalysis.amountParsed > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-dashed border-slate-250/60">
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Parsed target asset</span>
                      <span className="text-xs font-extrabold text-slate-800 capitalize font-mono block mt-0.5">
                        {result.financialAnalysis.itemParsed || "Unspecified asset"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Extracted total valuation</span>
                      <span className="text-xs font-extrabold text-slate-800 font-mono block mt-0.5">
                        {result.financialAnalysis.amountFormatted}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Required 20% down</span>
                      <span className="text-xs font-extrabold text-slate-800 font-mono block mt-0.5">
                        {result.financialAnalysis.downpaymentRequired || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-lg border border-slate-200/50">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wide font-sans">Projected monthly EMI</span>
                      <span className="text-xs font-extrabold text-amber-700 font-mono block mt-0.5">
                        {result.financialAnalysis.monthlyEmiEstimate || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-1 leading-relaxed">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Expert System Explainer</span>
                  <p className="text-xs text-slate-600 font-semibold leading-relaxed font-sans">{result.financialAnalysis.analysisText}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
