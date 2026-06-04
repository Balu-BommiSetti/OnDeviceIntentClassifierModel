import React, { useState } from "react";
import { TddViewer } from "./components/TddViewer";
import { ModelSelector } from "./components/ModelSelector";
import { LatencyCalculator } from "./components/LatencyCalculator";
import { NlpSandbox } from "./components/NlpSandbox";
import { FinanceDatasetGenerator } from "./components/FinanceDatasetGenerator";
import { TrainingPipeline } from "./components/TrainingPipeline";
import { 
  FileText, 
  Layers, 
  Calculator, 
  Terminal, 
  ExternalLink,
  Cpu,
  Smartphone,
  ShieldCheck,
  Dna,
  Database,
  Network
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"tdd" | "models" | "calculator" | "sandbox" | "dataset" | "pipeline" >("pipeline");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans tracking-tight selection:bg-indigo-500/10 selection:text-indigo-900">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm border border-slate-800">
              <Dna className="w-5 h-5 text-indigo-400 rotate-12" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-sans font-bold text-slate-900 tracking-tight text-sm md:text-base leading-none">
                  ON-DEVICE NLP ARCHITECT
                </h1>
                <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  v1.2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mobile TF.js Production Blueprint</p>
            </div>
          </div>

          {/* External Project metadata indicators */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>ANE / NNAPI Optimized</span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Cpu className="w-4 h-4 text-indigo-500" />
              <span>Offline Compiles: OK</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Inner Tab bar controls */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex space-x-1 overflow-x-auto scrollbar-none max-w-full">
            {[
              { id: "pipeline", name: "AI Training Pipeline", icon: Network },
              { id: "dataset", name: "Finance Dataset Generator", icon: Database },
              { id: "tdd", name: "Technical Design Document", icon: FileText },
              { id: "models", name: "Decision Matrix & Models", icon: Layers },
              { id: "calculator", name: "Quantitative Spec Estimator", icon: Calculator },
              { id: "sandbox", name: "Inference Simulator Sandbox", icon: Terminal }
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Small info text */}
          <span className="hidden lg:inline text-[11px] font-mono text-slate-400 uppercase tracking-widest font-bold">
            Target: React Native + TF.js
          </span>
        </div>

        {/* Tab Content Display Frame */}
        <div className="min-h-[500px]">
          {activeTab === "pipeline" && <TrainingPipeline />}
          {activeTab === "dataset" && <FinanceDatasetGenerator />}
          {activeTab === "tdd" && <TddViewer />}
          {activeTab === "models" && <ModelSelector />}
          {activeTab === "calculator" && <LatencyCalculator />}
          {activeTab === "sandbox" && <NlpSandbox />}
        </div>

      </main>

      {/* Persistent Footer Workspace Elements */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 mt-16 font-sans text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-200 font-bold font-sans">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>TensorFlow.js Mobile SDK Integration Guidance</span>
            </div>
            <p className="text-slate-400 text-[11px] max-w-2xl leading-normal">
              Built in compliance with high-performance on-device execution requirements, utilizing isolated thread pipelines, WebGL acceleration context layers, and INT8 model quantization.
            </p>
          </div>
          <div className="shrink-0 flex flex-wrap gap-4 text-[11px]">
            <a 
              href="https://js.tensorflow.org" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center space-x-1"
            >
              <span>TensorFlow.js Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-[10px]">Secure Core Blueprint &copy; 2026</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

