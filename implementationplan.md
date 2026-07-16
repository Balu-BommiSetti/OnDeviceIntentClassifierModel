# V6 NLP Architecture Redesign (Hierarchical Classification)

This document details the architectural migration from the current "flat" intent-based NLP pipeline to the sophisticated hierarchical pipeline:
`User Query -> Intent -> Task Type -> Entity Extractor -> Backend Action Resolver`.

## Problem Statement
The current system directly maps utterances to a single `Intent` (e.g., `BUDGET_PLANNING`). This limits conversational flexibility because "Show my budget", "Create a budget", and "Which category exceeded my budget?" are lumped into the same domain but represent distinct user goals (STATUS vs CREATE vs ANALYSIS).

## Proposed Architecture

We will implement a 3-tier classification strategy:
1. **Domain Intent** (`BUDGET_PLANNING`, `SPENDING_ANALYSIS`, etc.)
2. **Task Type** (`CREATE`, `STATUS`, `ANALYSIS`, `FORECAST`, etc.)
3. **Entities** (Slots like `Category`, `Amount`, `Date`)

### Approved Decisions

> [!TIP]
> **Model Architecture**: We will build the **3-head TFJS model**. The network will natively output `Intent` (e.g., BUDGET_PLANNING), `TaskType` (e.g., ANALYSIS), and `Slots` (Entities), maintaining a structurally pure taxonomy without class explosion.
> 
> **Data Generation Approach**: We will use a **Code-Only Procedural Generation** approach. 
> *Why?* Generating 16 Intents × 12 TaskTypes × 20,000 examples = **~3.84 Million records**. Relying on an LLM API for this volume would take days, hit quota limits, and be expensive. 
> Instead, we will build a highly advanced TypeScript templating engine that uses:
> 1. Deep synonym dictionaries.
> 2. Pre/post-fix conversational wrappers.
> 3. Algorithmic typo injection, grammar disruption, and regionalization.
> This will programmatically yield millions of diverse, high-quality records in seconds.

## Proposed Changes

---

### Phase 1: Generator Architecture Restructuring (`on-device-nlp-workspace`)
We will completely break apart `generate_dataset.ts` into a maintainable, modular structure:
#### [NEW] `src/taxonomy/intents.ts`
#### [NEW] `src/taxonomy/taskTypes.ts`
#### [NEW] `src/taxonomy/backendActions.ts`
#### [NEW] `src/templates/budgetTemplates.ts`, `goalTemplates.ts`, etc.
#### [NEW] `src/generators/UtteranceGenerator.ts`
#### [NEW] `src/validators/DatasetValidator.ts`
#### [MODIFY] `generate_dataset.ts` -> Will act as the orchestrator to stitch templates together.

---

### Phase 2: TFJS Model Multi-Head Expansion (`on-device-nlp-workspace`)
#### [MODIFY] `training_pipeline/train.py`
We will alter the Keras Functional API model architecture to include a third output layer for `TaskType`:
```python
task_output = Dense(num_task_types, activation='softmax', name='task_type_output')(x)
model = Model(inputs=input_layer, outputs=[intent_output, task_output, slot_output])
```

---

### Phase 3: WealthPilot Integration (`WealthPilot`)
#### [MODIFY] `utils/ai/nlp/LocalNLPEngine.ts`
Update the model inference to decode the new `taskType` head from the TFJS prediction buffer.
#### [NEW] `utils/ai/nlp/BackendActionResolver.ts`
A new layer that computes the `BackendAction` based on the evaluated Intent + Task Type + Entities. Example:
```typescript
if (intent === 'BUDGET_PLANNING' && taskType === 'ANALYSIS') {
  return 'ANALYZE_BUDGET_OVERRUN';
}
```
#### [MODIFY] `utils/ai/CognitionFacade.ts`
Update the bridging interface so the UI knows how to consume `BackendAction` alongside intents.

## Verification Plan
### Automated Tests
- The dataset validator will run during generation to enforce balanced Intent/TaskType matrices and catch duplications.
### Manual Verification
- We will query the newly integrated model in WealthPilot with complex analytical questions (e.g., "Which category exceeded my budget?") and ensure the `BackendActionResolver` yields the precise analytical UI view.
