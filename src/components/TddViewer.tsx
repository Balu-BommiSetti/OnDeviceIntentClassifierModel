import React, { useState } from "react";
import { 
  Cpu, 
  Layers, 
  Workflow, 
  Zap, 
  Terminal, 
  ShieldCheck, 
  GitMerge, 
  Database,
  ChevronDown,
  ChevronUp,
  Sliders,
  FileText
} from "lucide-react";

export function TddViewer() {
  const [expandedSection, setExpandedSection] = useState<string | null>("architecture");

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-8">
      {/* Introduction Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-start md:items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-indigo-400 font-mono">CONFIDENTIAL &bull; PRODUCTION READY</span>
            <h1 className="text-2xl md:text-3xl font-sans font-bold tracking-tight mt-1 text-slate-100">
              Offline On-Device NLP Engine for React Native
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
              This document outlines the end-to-end technical architecture, model design, trade-off matrices, and optimization strategies to deliver high-performance, low-latency, and zero-battery-drain intent prediction and slot-filling directly within consumer mobile devices.
            </p>
          </div>
        </div>
      </div>

      {/* Accordion Sections for TDD */}
      <div className="space-y-4">
        
        {/* Section 1: System Architecture */}
        <div id="section_system_arch" className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs transition-all hover:border-slate-300">
          <button 
            onClick={() => toggleSection("architecture")}
            className="w-full flex items-center justify-between p-5 text-left font-sans font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Workflow className="w-5 h-5 text-slate-500" />
              <span>1. System Architecture & Thread Isolation</span>
            </div>
            {expandedSection === "architecture" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {expandedSection === "architecture" && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-6 text-sm leading-relaxed text-slate-600 font-sans">
              
              <div>
                <h3 className="text-slate-800 font-semibold text-base mb-2">1.1 End-to-End Execution Flow</h3>
                <p className="mb-4">
                  To prevent blocking the primary React Native Javascript thread (responsibles for UI layout at 60 FPS), the on-device NLP model executes entirely asynchronously in a dedicated <strong>Isolated Worker Thread</strong> or via a custom Native Module wrapping the mobile OS&apos;s native Neural Engine / hardware accelerator interfaces.
                </p>
                
                {/* Visual Pipeline Block Diagram */}
                <div className="my-6 bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800">
                  <div className="text-indigo-400 text-center mb-2 font-bold uppercase tracking-wider">// ON-DEVICE PIPELINE RUNTIME FLOW</div>
                  <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-2 text-center p-2">
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 w-full md:w-36">
                      <span className="text-gray-400 block font-sans">1. User Input</span>
                      <span className="text-amber-400">&ldquo;Set alarm 7am&rdquo;</span>
                    </div>
                    <div className="text-slate-500 font-bold">&rarr;</div>
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 w-full md:w-36">
                      <span className="text-gray-400 block font-sans">2. Tokenizer</span>
                      <span className="text-emerald-400">Vocab &amp; Subwords</span>
                    </div>
                    <div className="text-slate-500 font-bold">&rarr;</div>
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 w-full md:w-36">
                      <span className="text-gray-400 block font-sans">3. Embedding</span>
                      <span className="text-cyan-400">TF.js Tensor (1xSx312)</span>
                    </div>
                    <div className="text-slate-500 font-bold">&rarr;</div>
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 w-full md:w-36">
                      <span className="text-gray-400 block font-sans">4. Dual Head Model</span>
                      <span className="text-rose-400">CNN + BiLSTM</span>
                    </div>
                    <div className="text-slate-500 font-bold">&rarr;</div>
                    <div className="bg-slate-800 p-3 rounded border border-slate-700 w-full md:w-36">
                      <span className="text-gray-400 block font-sans">5. JSON Output</span>
                      <span className="text-purple-400">{"{ intent, entities }"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-2">
                    <Cpu className="w-4 h-4 text-slate-500" />
                    <h4>1.2 Native &amp; GPU Hardware Acceleration</h4>
                  </div>
                  <p className="text-xs">
                    We compile and load models using <strong>tfjs-react-native</strong>. On iOS, the package activates the WebGL helper or CoreML delegates for direct hardware acceleration on the Apple Neural Engine (ANE). On Android, the pipeline delegates computations to NNAPI (Neural Networks API), utilizing target chipset GPUs and dedicated NPU hardware cores, keeping CPU utilization below 12%.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold mb-2">
                    <Database className="w-4 h-4 text-slate-500" />
                    <h4>1.3 Offline Caching &amp; Over-the-Air (OTA) Updates</h4>
                  </div>
                  <p className="text-xs">
                    The serialized <code>model.json</code> and binary weights are packaged within the React Native app package assets for instant offline execution on first boot. An background synchronizer queries an API weekly, downloading updated models (e.g. customized vocabularies) directly into the device&apos;s isolated sandboxed filesystem (DocumentDirectory) avoiding app store redeployment.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-lg text-xs leading-relaxed text-slate-700">
                <span className="font-semibold text-amber-800 block mb-1">PRO-TIP: THREAD CONGESTION PREVENTION</span>
                Always pre-warm the Model and Tokenizer context during React Native app setup in <code>App.tsx / useEffect</code>. The initial compilation chunk takes ~150-400ms. Pre-instantiating the memory buffers ensures subsequent input typing invokes zero visible runtime input lag.
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Intent Classification & Entity Extraction */}
        <div id="section_nlp_approach" className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs transition-all hover:border-slate-300">
          <button 
            onClick={() => toggleSection("methodology")}
            className="w-full flex items-center justify-between p-5 text-left font-sans font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Layers className="w-5 h-5 text-slate-500" />
              <span>2. Multi-class Intent Classification & Sequence Tagging</span>
            </div>
            {expandedSection === "methodology" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {expandedSection === "methodology" && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-6 text-sm leading-relaxed text-slate-600 font-sans">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-800 font-semibold text-sm mb-2 uppercase tracking-wide text-indigo-600">2.1 Intent Prediction Header</h4>
                  <p className="text-xs mb-3 leading-relaxed">
                    To categorize user statements (e.g. <code>book_flight</code>, <code>set_alarm</code>), the encoded input sequence vector is fed into a <strong>Global Max Pooling 1D layer</strong>, summarizing the context. This output flows through a Dense Layer with a <strong>Softmax activation function</strong>:
                  </p>
                  <p className="bg-slate-100 p-2 rounded text-xs font-mono text-slate-700 mb-3">
                    P(Intent = k | Input) = exp(Z_k) / Sum_j( exp(Z_j) )
                  </p>
                  <p className="text-xs">
                    This multi-class classification yields discrete relative probability indices. To prevent erratic hallucinated intents for OOV query noise, we apply a confidence threshold of <strong>&ge; 0.72</strong>; fallbacks default to an <code>UNKNOWN_INTENT</code> categorization.
                  </p>
                </div>

                <div>
                  <h4 className="text-slate-800 font-semibold text-sm mb-2 uppercase tracking-wide text-indigo-600">2.2 Named Entity Extraction (NER)</h4>
                  <p className="text-xs mb-3 leading-relaxed">
                    Entity extraction maps sequences of words to specific variables (e.g. dates, destinations, names) using <strong>IOB2 Tagging format</strong> (Inside-Outside-Beginning, e.g., <code>B-DEST</code>, <code>I-DEST</code>, <code>O</code>):
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 mb-3">
                    <li><strong>B-[Entity]</strong>: The beginning element of the chunk</li>
                    <li><strong>I-[Entity]</strong>: Continuing tokens inside the chunk</li>
                    <li><strong>O</strong>: Outside all targeted entities</li>
                  </ul>
                  <p className="text-xs leading-relaxed">
                    Instead of high-resource-overhead CRF (Conditional Random Fields) layers which cannot compile elegantly in standard TFJS mobile WebGL pipelines, we employ a <strong>TimeDistributed Dense layer</strong> with Softmax outputs across each individual sequence token.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-4">
                <h4 className="text-slate-800 font-semibold text-sm mb-2">2.3 Embedding Strategy & Vocabulary Pruning</h4>
                <p className="text-xs leading-relaxed mb-3">
                  In typical server-side Large Language Models, embedding parameters represent over 80% of entire network bulk (vocabularies &ge; 50,000 words mapped to 768 dimensions require roughly 150MB disk space). On-device deployments require aggressive <strong>Embedding optimization</strong> to keep size below 5MB:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded border border-slate-100 text-xs">
                    <span className="font-semibold block text-slate-800 text-[11px] mb-1">1. Subword WordPiece Tokenizer</span>
                    <p className="text-[11px] text-slate-500">
                      Utilizes a structured subword vocabulary limited strictly to <strong>8,000 tokens</strong>. This successfully matches any sentence with complex roots while shrinking embedding size to only 2.4MB.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-100 text-xs">
                    <span className="font-semibold block text-slate-800 text-[11px] mb-1">2. Embedding Weight Quantization</span>
                    <p className="text-[11px] text-slate-500">
                      Continuous weights are compressed from 32-bit floats to 8-bit unsigned integers (INT8). On-device, TFJS automatically unpacks weights to dynamic float values during model warm-up.
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border border-slate-100 text-xs">
                    <span className="font-semibold block text-slate-800 text-[11px] mb-1">3. Character-gram Backup Layer</span>
                    <p className="text-[11px] text-slate-500">
                      Provides subword embeddings. Any unrecognized or typo-prone sequences are hashed into 3-to-4 character sliding windows, ensuring the parser never throws out-of-bounds index errors.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Section 3: Training and Validation Pipeline */}
        <div id="section_pipeline" className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs transition-all hover:border-slate-300">
          <button 
            onClick={() => toggleSection("pipeline")}
            className="w-full flex items-center justify-between p-5 text-left font-sans font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Terminal className="w-5 h-5 text-slate-500" />
              <span>3. Training, Validation &amp; TF.js Export Pipelines</span>
            </div>
            {expandedSection === "pipeline" ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          
          {expandedSection === "pipeline" && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-6 text-sm leading-relaxed text-slate-600 font-sans">
              
              <div>
                <h4 className="text-slate-800 font-semibold text-sm mb-2">3.1 Python Training &amp; Validation Flow</h4>
                <p className="text-xs mb-3">
                  Models are developed in Python using TensorFlow 2.x or PyTorch (then exported via safe ONNX routes to Keras). The validation pipeline evaluates accuracy alongside strict on-device performance constraints:
                </p>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] space-y-2 border border-slate-800">
                  <p className="text-emerald-400"># PIPELINE SCRIPT FLOW</p>
                  <p><span className="text-indigo-400">def</span> <span className="text-sky-400">validate_onnx_robustness</span>(model, dataset):</p>
                  <p className="pl-4 text-slate-400"># 1. Standard F1 score tracking (Multi-task loss validation)</p>
                  <p className="pl-4">f1_intent, f1_entities = eval_validation_metrics(model, dataset)</p>
                  <p className="pl-4 text-slate-400"># 2. Add adversarial Noise &amp; Typo induction tests</p>
                  <p className="pl-4">noisy_dataset = inject_user_typos(dataset, severity=0.15)</p>
                  <p className="pl-4">f1_robustness = eval_validation_metrics(model, noisy_dataset)</p>
                  <p className="pl-4 text-slate-400"># 3. Fail build if robustness deviation falls below 5% compared to clean inputs</p>
                  <p className="pl-4">assert (f1_intent - f1_robustness) &lt; 0.05, <span className="text-amber-400">&quot;Robustness test failed due to typo instability&quot;</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-slate-800 font-semibold text-sm mb-2">3.2 TF.js Converter Shell Export Script</h4>
                <p className="text-xs mb-3">
                  Once saved as a native TensorFlow Keras model, use the official Python <code>tensorflowjs</code> package to serialize and compile the weights into static JSON chunks, applying aggressive uint8 quantization:
                </p>
                <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-[11px] opacity-95">
                  <span className="text-slate-500 block mb-1"># Execute in training environment console:</span>
                  <p className="text-indigo-400">
                    pip install tensorflowjs scipy
                  </p>
                  <p className="text-slate-200 mt-2">
                    tensorflowjs_converter \
                  </p>
                  <p className="pl-4 text-emerald-400">--input_format=tf_saved_model \</p>
                  <p className="pl-4 text-emerald-400">--saved_model_tags=serve \</p>
                  <p className="pl-4 text-emerald-400">--quantize_uint8=* \</p>
                  <p className="pl-4 text-sky-400">./exports/saved_tf_model \</p>
                  <p className="pl-4 text-yellow-400">./exports/react_native_assets</p>
                </div>
                <p className="text-xs mt-3">
                  The generated output folder includes a <code>model.json</code> containing the neural layers and execution graphs, accompanied by a collection of <strong>4MB binary file chunks</strong> containing the quantized model weights.
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg text-xs text-slate-700">
                <span className="font-semibold text-indigo-900 block mb-1">3.3 Production Loading Code (React Native API)</span>
                <p className="mb-2 text-[11px]">To load these local chunks efficiently inside React Native using TensorFlow.js, use the following bundle-resource layout:</p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded font-mono text-[10px] overflow-x-auto">
                  <p><span className="text-pink-400">import</span> * <span className="text-pink-400">as</span> tf <span className="text-pink-400">from</span> <span className="text-emerald-400">&apos;@tensorflow/tfjs&apos;</span>;</p>
                  <p><span className="text-pink-400">import</span> * <span className="text-pink-400">as</span> tf_rn <span className="text-pink-400">from</span> <span className="text-emerald-400">&apos;@tensorflow/tfjs-react-native&apos;</span>;</p>
                  <p className="text-slate-400 mt-1">// Load compressed weights from the bundled native asset loader</p>
                  <p><span className="text-indigo-400">async function</span> <span className="text-sky-400">loadOnDeviceNLP</span>() {"{"}</p>
                  <p className="pl-4">await tf.ready();</p>
                  <p className="pl-4">const modelJson = require(<span className="text-emerald-400">&apos;../assets/model.json&apos;</span>);</p>
                  <p className="pl-4">const modelWeights = [require(<span className="text-emerald-400">&apos;../assets/weights.bin&apos;</span>)];</p>
                  <p className="pl-4">const model = await tf_rn.loadGraphModel(modelJson, {"{"} weightSource: modelWeights {"}"});</p>
                  <p className="pl-4"><span className="text-indigo-400">return</span> model;</p>
                  <p>{"}"}</p>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
