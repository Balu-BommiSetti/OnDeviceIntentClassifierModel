# Graph Report - on-device-nlp-workspace  (2026-06-04)

## Corpus Check
- 16 files · ~25,371 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 130 nodes · 144 edges · 10 communities (9 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]

## God Nodes (most connected - your core abstractions)
1. `main()` - 5 edges
2. `NLPCoprocessor` - 5 edges
3. `AI Training Pipeline- On-Device NLP Intent and Entity Extraction` - 5 edges
4. `run_inference()` - 4 edges
5. `clean_tokenize()` - 4 edges
6. `build_vocab_and_label_mappings()` - 4 edges
7. `vectorize_samples()` - 4 edges
8. `Execution Guide` - 4 edges
9. `clean_tokenize()` - 3 edges
10. `load_dataset()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (10 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (27): AMOUNTS, ASSET_NAMES, ASSET_TYPES, CATEGORIES, COMMITMENT_TYPES, CURRENCY_SYMBOLS, ENDERS, FILLERS (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (27): AMOUNTS, ASSET_NAMES, ASSET_TYPES, COMMITMENT_TYPES, CURRENCY_SYMBOLS, ENDERS, FILLERS, FREQUENCIES (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (10): FinanceDatasetGenerator(), LatencyCalculator(), ARCHITECTURES, ModelSelector(), NlpSandbox(), SAMPLE_UTTERANCES, TddViewer(), ModelArchitecture (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (14): 1. Set Up Python Environment, 2. Run Training Pipeline, 3. Test Predictions Locally, AI Training Pipeline- On-Device NLP Intent and Entity Extraction, code:block1 (/training_pipeline), code:bash (pip install -r requirements.txt), code:bash (python train.py), code:bash (python test_inference.py) (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (11): build_multitask_model(), build_vocab_and_label_mappings(), clean_tokenize(), load_dataset(), main(), Translates raw string datasets and sequential chunk vectors to numpy training ar, Creates a unified Shared-Representation Multi-Task deep neural model.     Head A, Reads dataset from disk. Supports local fallback coordinates. (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (5): ModelLabels, ModelVocab, NLPCoprocessor, NLPEngine, NLPResult

### Community 6 - "Community 6"
Cohesion: 0.4
Nodes (5): CODE_FILES, generateConfusionMatrixData(), LIST_OF_INTENTS, LIST_OF_SLOTS, TrainingPipeline()

### Community 7 - "Community 7"
Cohesion: 0.47
Nodes (5): clean_tokenize(), main(), Normalized whitespace split with basic punctuation sanitation., Simulates high-performance on-device execution:     1. Preprocesses/Tokenizes te, run_inference()

## Knowledge Gaps
- **77 isolated node(s):** `INTENTS`, `VERBS_SPEND`, `VERBS_INCOME`, `VERBS_LIMIT`, `CURRENCY_SYMBOLS` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `INTENTS`, `VERBS_SPEND`, `VERBS_INCOME` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._