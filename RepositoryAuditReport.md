Repository Audit Report — On-Device Intent Classifier Pipeline
Scope: Review and validation only. No changes were made to the repository.
Date: 2026-06-29

Executive Summary
The repository implements an end-to-end pipeline: synthetic finance utterance generation (TypeScript) → JSONL conversion → multi-task TensorFlow training (intent + taskType + slot tagging) → TF.js export → React Native inference. The architecture is reasonable and the template corpus is large and well-organized. However, there are two confirmed critical defects that break the slot/entity functionality and the on-device inference contract, plus several reproducibility and robustness concerns. As-is, intent classification likely works, but entity/slot extraction is unreliable both in training labels and at inference time.

Production readiness: NOT READY. Two ❌ critical issues must be addressed before deployment.

Repository Health Assessment
Area	Status
Dataset generation (intents)	✅ Verified Correct
Slot annotation correctness	❌ Confirmed Issue
Preprocessing consistency	⚠ Potential Concern
Training pipeline	✅ mostly correct
Split / leakage	⚠ Potential Concern
Evaluation methodology	⚠ Potential Concern
TF.js export	✅ / ⚠
On-device inference	❌ Confirmed Issue
Reproducibility	⚠
Docs	⚠
Confirmed Strengths ✅
Large, well-structured template registry (15 intents × multiple sub-intents × ~30 templates) with round-robin sampling to avoid template over-fitting — generateDataset_V4.ts:1999-2003.
Negative/UNKNOWN class injection (~10k samples) for out-of-domain rejection — convert_v4_to_jsonl.ts:85-88. Good practice for an on-device classifier.
Confidence thresholding at inference (0.65 → UNKNOWN) to suppress hallucinated actions — ReactNativeInference.ts:185-187.
Memory-safe inference via tf.tidy() wrappers — appropriate for RN/mobile OOM avoidance.
Deterministic seeds in training (tf.random.set_seed(42), np.random.seed(42)) — train.py:29-30.
Reserved PAD/UNK indices (0/1) consistent across vocab construction.
Confirmed Issues ❌
❌ CRITICAL-1: Output-head index mismatch between training and on-device inference
Evidence: The model is built with outputs [intent_out, task_out, slots_out] — slots are at index 2 — train.py:199. The Python test runner correctly reads predictions[2] for slots... actually it reads predictions[1] (test_inference.py:53) — also wrong, but the React Native module explicitly assumes a 2-head model:


// Perform inference (Heads: 0 is Intent, 1 is Slots)
const slotPredictions = predictionWrapper[1];   // ← this is taskType, not slots
ReactNativeInference.ts:162-170

The model has three heads [intent, taskType, slots]. Index 1 is the taskType softmax (a small per-utterance distribution), not the per-token slot sequence. The downstream BIO decoding loop will read garbage tag IDs.

Impact (Critical): On-device entity extraction is fundamentally broken. slotPredictions.argMax(-1) is run over the taskType head whose shape/semantics differ entirely from the slot head. test_inference.py shares the same off-by-one (predictions[1]), so even the "verification" script reports slots from the wrong head.

Recommendation (suggestion only): Inference should index the slot head at [2] and the intent head at [0], matching build_model's output order. Order should be asserted, not assumed (e.g., key outputs by name).

❌ CRITICAL-2: Slot/entity training labels are systematically wrong because noise is applied after slot resolution and surface≠value
Evidence (two compounding bugs):

Noise applied after slots are recorded. resolveSlots() substitutes surface text and records slot values, then applyNoise() mutates the utterance (uppercase/lowercase/typos/double-space/budget→budgt) — generateDataset_V4.ts:2006-2007, applyNoise:1975-1986. The stored slot value no longer matches the (now-altered) utterance text.

Slot value is the canonical/DB value, not the surface form. For amounts: surface "₹45.50" / "45.50rs" / "Forty-five rupees and fifty paisa" but value "45.50" — mock_data.ts:597-615. For sources: surface "salary" → value "Salary" (generateDataset_V4.ts:42-48). Source is even re-keyed to category (resolveSlots:1962).

train.py aligns entities by exact token match: if tokens[idx:idx+len(entity_tokens)] == entity_tokens where entity_tokens = clean_tokenize(entity.value) — train.py:143-149. When value="45.50" and the utterance contains "₹45.50" or "forty-five rupees", no match is found, so the token stays "O".

Impact (Critical): A large fraction of training tokens that should be B-AMOUNT/B-CATEGORY/etc. are labeled "O". The slot head is trained against corrupted labels → it will under-predict entities. The flat slot classification report will look deceptively high because "O" dominates (class imbalance), masking the failure.

Recommendation (suggestion only): Align entities on the surface string actually inserted into the utterance, run noise before recording final slot spans (or record character offsets at substitution time), and keep canonical value as a separate field used only for the action payload — not for BIO alignment.

Potential Concerns ⚠
⚠ Preprocessing divergence: typo noise destroys vocabulary alignment
applyNoise injects typos (budget→budgt, double spaces) and case changes. Training tokenization lowercases, so case is fine, but injected typos create tokens that only appear in training and fragment the vocab. More importantly the same noise corrupts slot surface tokens (see CRITICAL-2). Impact: Medium.

⚠ Data split performed twice, inconsistently
The generator assigns a split field per sample (generateDataset_V4.ts:2010), but train.py ignores it and re-splits via random.shuffle + 80/10/10 slicing (train.py:218-225). The split field is dead metadata. Impact: Low (functionally the train split is still random), but misleading.

⚠ Data leakage risk from near-duplicate templates
With only ~30 templates per sub-intent and 2000 samples generated per sub-intent (round-robin), each template is rendered ~66 times with random slot fills. Random splitting means structurally near-identical utterances (same template, different amounts) land in both train and test. Impact: Medium — reported test accuracy overstates generalization to genuinely novel phrasings.

⚠ Token-dropout augmentation can blank slot tokens
Training applies 10% random <UNK> dropout (train.py:127-130) but slot labels (Y_slots) are computed from the original tokens, so a dropped-out token keeps its B-/I- label — adding label noise specifically on entities. Impact: Low–Medium.

⚠ Evaluation metrics: slot report includes O and is token-level, not entity-level
The slot classification report flattens all non-pad tokens including the dominant O class (train.py:301-317). With CRITICAL-2 mislabeling most entities as O, accuracy/F1 will appear high while real entity recall is low. No entity-level (span) F1 is reported. Impact: Medium — reported metrics are not trustworthy for the slot task.

⚠ TF.js export relies on a manual model.json "patcher"
convert.py:31-115 hand-edits the exported model.json (Functional→Model rename, inbound-node reshaping, renaming dense/kernel→slots/kernel). This is brittle and Keras-version-dependent. Note train.py also exports TF.js directly via tfjs.converters.save_keras_model (train.py:358-360) without patching — so two export paths produce differently-structured model.json, and only one is patched. Impact: Medium — unclear which artifact ships; the unpatched one may not load in tfjs-react-native.

⚠ Hardcoded external path in convert.py
WEALTHPILOT_ASSETS_DIR = "../../WealthPilot/wealthpilot_native_app/..." (convert.py:10) assumes a sibling repo layout. Impact: Low (fails gracefully-ish), but non-portable and undocumented.

⚠ Inference entity post-processing assumes lowercase slot label amount
ReactNativeInference.ts:242 checks entities['amount'], but slot labels are uppercased to AMOUNT during training (train.py:80,147) and the decoder uses tagStr.substring(2) preserving case → key is AMOUNT. The amount-cleaning branch never fires. Impact: Low.

Missing Validations
No automated test asserting generator slot values appear in the utterance (would have caught CRITICAL-2).
No test asserting inference head ordering matches train.py (would have caught CRITICAL-1).
No entity-level (span) precision/recall/F1; only token-level with O included.
No check that the shipped model.json actually loads in @tensorflow/tfjs before copying to the app.
requirements.txt not pinned to versions verified against the Keras-3 patcher logic (review of requirements.txt recommended).
The audit_report.json in repo shows 20/20 passed but contains empty details — provenance/coverage of that check is unverifiable.
Risk Rating Summary
#	Finding	Severity
CRITICAL-1	Inference reads taskType head as slots (head index mismatch)	Critical
CRITICAL-2	Slot labels corrupted (noise-after-resolve + value≠surface)	Critical
C-3	Two divergent TF.js export paths; only one patched	Medium
C-4	Train/test leakage from template reuse	Medium
C-5	Slot metrics include O, no span-level F1	Medium
C-6	Dead split field; re-split in trainer	Low
C-7	Token-dropout adds entity label noise	Low–Medium
C-8	entities['amount'] case mismatch (AMOUNT)	Low
C-9	Hardcoded sibling-repo export path	Low
Production Readiness Assessment
Not production-ready. Intent classification is plausibly functional, but the entity/slot subsystem is broken at both the data-labeling layer (CRITICAL-2) and the inference layer (CRITICAL-1). Since the product's value (logging amounts, categories, goals from natural language) depends on slot extraction, the pipeline cannot be trusted in its current state, and reported slot metrics are unreliable.

Recommended Next Steps 💡 (recommendations only — no implementation performed)
💡 Fix head indexing in ReactNativeInference.ts and test_inference.py to address the slot head by name/index 2, and add an assertion on output order.
💡 Re-architect slot grounding in the generator: align BIO tags to the actual inserted surface text, apply noise before recording spans, and keep canonical values separate from alignment.
💡 Consolidate to one TF.js export path and add a load-test of the produced model.json in a tfjs harness before shipping.
💡 Add entity-level (span) precision/recall/F1 and exclude/break out O in slot evaluation.
💡 Split by template/structure, not by random sample, to measure true generalization.
💡 Add regression tests: "every generated sample's slot values are recoverable from its utterance" and "inference output shapes match training heads."
💡 Pin Python deps and document which generator version (V3/V4) is canonical — README references a "v6 generator" (train.py:40) that does not exist in the repo.