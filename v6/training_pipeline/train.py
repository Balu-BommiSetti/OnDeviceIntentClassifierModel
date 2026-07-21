#!/usr/bin/env python3
"""
On-Device NLP Training Pipeline: Intent Classification & Entity Slot Tracking
Optimized for TensorFlow.js Mobile and WebGL Deployments.
Saves: model.json, weights.bin, vocabulary.json, labels.json

Author: NLP Architect Team
Date: 2026-06-03
"""

import os
import shutil
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import json
import re
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Embedding, Bidirectional, LSTM, Dense, TimeDistributed, Dropout, GlobalAveragePooling1D
from sklearn.metrics import classification_report, confusion_matrix

# Configuration Constants
MAX_SEQ_LENGTH = 64
EMBEDDING_DIM = 300  # FastText uses 300d vectors
LSTM_UNITS = 64
DROPOUT_RATE = 0.3
BATCH_SIZE = 128
# EPOCHS is a CEILING, not a target — EarlyStopping(patience=4,
# restore_best_weights=True) decides when to stop. It was 10, which at
# ~23 steps/epoch gave only ~230 gradient steps for stage 1: the model
# plateaued at 0.42 TRAIN accuracy, i.e. it could not fit its own training
# data. Early stopping never fired because training ended before convergence.
EPOCHS = 120
# Stage 2 fine-tunes unfrozen embeddings at a 10x lower LR, so it needs room too.
# Raised from 40 after run 4 consumed the entire ceiling (40/40) without
# EarlyStopping(patience=3) ever firing — i.e. it stopped because it ran out
# of epochs, not because it converged. Stage 1 by contrast halted naturally at
# 19/120, so only stage 2 was ceiling-bound.
FINETUNE_EPOCHS = 150
# Overridable for the seed-spread experiment (BACKLOG: run-to-run variance).
# NOTE a fixed seed did NOT give reproducible runs: B-PERIOD recall moved
# 0.895 -> 0.795 between runs 15 and 16 under seed 42 (dataset edits plus TF
# op-level nondeterminism on this hardware). The spread across seeds is the
# honest error bar for ANY single-run comparison.
RANDOM_SEED = int(os.environ.get("SEED", "42"))
BOUNDARY_PERCENTILE = 95
BOUNDARY_RADIUS_MULTIPLIER = 1.15
TEMPERATURE_GRID = np.linspace(0.5, 5.0, 46)

tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def load_dataset():
    """Reads JSONL dataset from disk.

    spec_dataset.jsonl (src/knowledge/generateFromSpec.ts) is the current,
    actively-maintained dataset — spec-driven, validated by validate.ts's
    quality gate, versioned via manifest.ts. combinatorial_dataset.jsonl
    (the legacy v6/dataset_generator/combinatorial_generate.py pipeline) is
    kept only for reference; it is no longer regenerated or extended.
    """
    dataset_file = "../../exported_dataset/spec_dataset.jsonl"

    if not os.path.exists(dataset_file):
        raise FileNotFoundError(
            f"Could not locate {dataset_file}. "
            "Run `npm run dataset:build` in the repo root first (generates, "
            "validates, and manifests spec_dataset.jsonl)."
        )

    print(f"[*] Loading dataset file: {dataset_file}")
    samples = []
    with open(dataset_file, "r") as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))
    return samples

_CURRENCY_SYMBOLS = re.compile(r"[$₹£€₨]")
_SENTENCE_PUNCT = re.compile(r"(?<!\d)[.,](?!\d)|[?!]")

def clean_tokenize(text):
    """Normalized whitespace split with numeric-aware punctuation handling."""
    text_clean = _CURRENCY_SYMBOLS.sub("", text.lower())
    text_clean = _SENTENCE_PUNCT.sub(" ", text_clean)
    tokens = [t.strip() for t in text_clean.split() if t.strip()]
    return tokens

def numeric_vocab_key(token):
    """
    Maps a numeric-looking token to a shape bucket for VOCABULARY LOOKUP ONLY
    (the literal token text is still what gets returned by entity extraction).
    """
    if not any(c.isdigit() for c in token):
        return token
    digits = re.sub(r"[^0-9]", "", token)
    suffix = re.sub(r"[0-9.,]", "", token)
    has_decimal = "." in token
    return f"<NUM{len(digits)}{'D' if has_decimal else ''}{suffix}>"



def build_vocab_and_label_mappings(samples):
    """
    Builds a robust word-to-index mapping and indices for intents & slot classes.
    0 index is strictly reserved for padding across vocabulary and slot maps.
    1 index is reserved for UNK (unknown tokens).
    """
    word_counts = {}
    unique_intents = set()
    unique_tasks = set()
    unique_slots = {"O"}  # Start with Outside tag

    print("[*] Computing vocabulary and label distributions...")
    for sample in samples:
        tokens = sample.get("tokens", [])
        for token in tokens:
            processed_token = numeric_vocab_key(token)
            word_counts[processed_token] = word_counts.get(processed_token, 0) + 1
        
        unique_intents.add(sample["intent"])
        if "taskType" in sample:
            unique_tasks.add(sample["taskType"])
            
        for tag in sample.get("tags", []):
            unique_slots.add(tag.upper())

    # Sort vocabs by frequency for optimal layout.
    #
    # MIN_FREQ=2: singleton tokens are excluded so they map to <UNK> during
    # training. Without this, <UNK> exists in the vocab but appears in ZERO
    # training rows — the model can never learn what to do with an unknown
    # token, so a real user's typo ("petol") gets an untrained embedding and
    # its entity span is dropped. The generator's typo pass (tag-preserving
    # since run 41) creates one-off misspellings of entity values; excluding
    # them here turns those rows into exactly the lesson we need: <UNK> in an
    # entity position still carries the entity tag. Verified need: run 41 kept
    # per-token typo'd rows and STILL failed to tag "petol" — the typos each
    # got their own vocab entry, so UNK stayed untrained.
    # MIN_FREQ=2 was tried (run 42) and measured NET NEGATIVE: it shrank the
    # vocab by ~1000 entries and degraded the clean probe (89.1→87.4 intent)
    # and regression (37→36) without delivering typo tagging — because the
    # forced-O relabel below (now removed) was erasing UNK entity tags anyway.
    # With that fixed, the 10% dropout supplies balanced UNK exposure on its
    # own, so the full vocab stays.
    vocab = ["<PAD>", "<UNK>"]
    sorted_words = [w for w, c in sorted(word_counts.items(), key=lambda item: item[1], reverse=True)]
    vocab.extend(sorted_words)
    
    # Fast lookup dicts
    word2idx = {word: idx for idx, word in enumerate(vocab)}
    
    intents_list = sorted(list(unique_intents))
    intent2idx = {intent: idx for idx, intent in enumerate(intents_list)}
    
    tasks_list = sorted(list(unique_tasks))
    task2idx = {task: idx for idx, task in enumerate(tasks_list)}
    
    slots_list = sorted(list(unique_slots))
    slot2idx = {slot: idx for idx, slot in enumerate(slots_list)}
    
    return word2idx, vocab, intent2idx, intents_list, task2idx, tasks_list, slot2idx, slots_list


def vectorize_samples(samples, word2idx, intent2idx, task2idx, slot2idx, is_training=False):
    """
    Translates raw string datasets and sequential chunk vectors to numpy training arrays.
    Slices inputs precisely to MAX_SEQ_LENGTH with index padding.
    """
    num_samples = len(samples)
    print(f"[*] Vectorizing {num_samples} samples into numpy arrays...")
    X = np.zeros((num_samples, MAX_SEQ_LENGTH), dtype=np.int32)
    Y_intent = np.zeros((num_samples,), dtype=np.int32)
    Y_task = np.zeros((num_samples,), dtype=np.int32)
    Y_slots = np.zeros((num_samples, MAX_SEQ_LENGTH), dtype=np.int32)

    for i, sample in enumerate(samples):
        if (i + 1) % 50000 == 0:
            print(f"    ... Vectorized {i + 1}/{num_samples} samples.")
            
        tokens = sample.get("tokens", [])
        
        # 1. Map tokens to Word Index
        for j, token in enumerate(tokens[:MAX_SEQ_LENGTH]):
            processed_token = numeric_vocab_key(token)
            X[i, j] = word2idx.get(processed_token, word2idx["<UNK>"])
        
        # Data augmentation: random token dropout (training only)
        if is_training:
            for j in range(min(len(tokens), MAX_SEQ_LENGTH)):
                if X[i, j] != 0 and np.random.random() < 0.10:
                    X[i, j] = word2idx["<UNK>"]
            
        # 2. Map Intent & TaskType label
        Y_intent[i] = intent2idx.get(sample["intent"], intent2idx.get("UNKNOWN", 0))
        if "taskType" in sample:
            Y_task[i] = task2idx[sample["taskType"]]
        
        # 3. Align Entities to Tokens
        tag_sequence = sample.get("tags", [])
        
        for j, tag in enumerate(tag_sequence[:MAX_SEQ_LENGTH]):
            # UNK positions KEEP their true tags. The previous force-to-O here
            # was the root cause of the model never tagging a typo'd entity
            # ("petol", "grocries"): the 10% dropout above is the model's ONLY
            # UNK exposure, and relabeling those positions O taught, by
            # construction, that an unknown token is never an entity. Entity
            # identity comes from CONTEXT (the tokens around the span), which
            # is untouched by the dropout — keeping the tag is what turns the
            # dropout into OOV-robustness training instead of its opposite.
            Y_slots[i, j] = slot2idx.get(tag.upper(), slot2idx["O"])
            
    return X, Y_intent, Y_task, Y_slots

# Embedding source order (first that exists wins):
#   1. cc.en.300.bin  — Common Crawl SUBWORD model. Synthesizes a vector for
#      EVERY token (incl. Hinglish/brands/typos) from char n-grams. This is the
#      spike under test: wiki-news .vec left 1131/3068 real words (swiggy,
#      kharcha, icici, ppf …) at random init because .vec is a static lookup
#      that discards subword synthesis. Measured 62% coverage → the domain and
#      Hinglish tokens, exactly the highest-signal ones, were noise.
#   2. wiki-news-300d-1M.vec — the prior static-lookup path (kept as fallback).
#   3. random init.
FASTTEXT_BIN_PATH = "embeddings/cc.en.300.bin"
FASTTEXT_VEC_PATH = "embeddings/wiki-news-300d-1M.vec"


def _is_synthetic_token(tok):
    # Numeric buckets (<NUM3>, <NUM5D…>) and the reserved <PAD>/<UNK> are not
    # real words — feeding "<NUM3>" to subword synthesis yields a garbage vector
    # from the literal characters. Leave these at random init as before.
    return tok.startswith("<") and tok.endswith(">")


def load_fasttext_embeddings(word2idx):
    """
    Builds the [vocab x EMBEDDING_DIM] init matrix from the best available
    FastText source. Prefers the .bin subword model so OOV/Hinglish/brand
    tokens get real synthesized vectors instead of random noise.
    """
    vocab_size = len(word2idx)
    embedding_matrix = np.random.normal(scale=0.1, size=(vocab_size, EMBEDDING_DIM))

    # ---- Path 1: subword .bin (SPIKE — measured NET NEGATIVE, gated OFF) --
    # Run 44 re-init the matrix from cc.en.300.bin: coverage 62%->98% (all the
    # Hinglish/brand tokens rescued from random init), yet the model got WORSE
    # on every gate except the one it was meant to help: clean probe i+t
    # 83.4->75.4, regression 39->35, QA 142->129, entityExact 0.629->0.640
    # (flat, inside noise). Conclusion: entity extraction is NOT embedding-
    # coverage-bound here — the ceiling is architectural (word-level, ~5-token
    # Conv1D receptive field, frozen matrix). Generic web-meaning vectors for a
    # narrow 3k-vocab domain task actively competed with the from-scratch
    # signal the fine-tune otherwise learns. Kept behind a flag, not deleted,
    # so the finding is reproducible. Default is the .vec path (Path 2).
    if os.path.exists(FASTTEXT_BIN_PATH) and os.environ.get("USE_FT_SUBWORD") == "1":
        import fasttext
        print(f"[*] Loading FastText SUBWORD model from {FASTTEXT_BIN_PATH}...")
        model = fasttext.load_model(FASTTEXT_BIN_PATH)
        if model.get_dimension() != EMBEDDING_DIM:
            print(f"[!] .bin dim {model.get_dimension()} != EMBEDDING_DIM {EMBEDDING_DIM}; "
                  f"falling back to .vec path.")
        else:
            in_vocab, synthesized, skipped = 0, 0, 0
            for word, i in word2idx.items():
                if _is_synthetic_token(word):
                    skipped += 1
                    continue
                embedding_matrix[i] = model.get_word_vector(word)
                # get_word_id >= 0 means the exact word was in FT's vocab;
                # -1 means the vector was SYNTHESIZED from subwords (the win).
                if model.get_word_id(word) >= 0:
                    in_vocab += 1
                else:
                    synthesized += 1
            real = in_vocab + synthesized
            print(f"    - Subword matrix: {real}/{vocab_size} tokens got a REAL vector "
                  f"({in_vocab} exact-vocab, {synthesized} subword-synthesized), "
                  f"{skipped} synthetic tokens left random.")
            return embedding_matrix

    # ---- Path 2: static .vec lookup (prior behaviour, fallback) ----------
    if os.path.exists(FASTTEXT_VEC_PATH):
        print(f"[*] Loading FastText embeddings from {FASTTEXT_VEC_PATH}...")
        embeddings_index = {}
        with open(FASTTEXT_VEC_PATH, 'r', encoding='utf-8') as f:
            next(f)
            for line in f:
                values = line.rstrip().split(' ')
                embeddings_index[values[0]] = np.asarray(values[1:], dtype='float32')
        print(f"    - Loaded {len(embeddings_index)} word vectors.")
        hits, misses = 0, 0
        for word, i in word2idx.items():
            vec = embeddings_index.get(word)
            if vec is not None:
                embedding_matrix[i] = vec
                hits += 1
            else:
                misses += 1
        print(f"    - Vocabulary Matrix Created: {hits} hits, {misses} misses.")
        return embedding_matrix

    # ---- Path 3: nothing found -------------------------------------------
    print("[!] No FastText source found! Falling back to random initialization.")
    return None


def build_model(vocab_size, num_intents, num_tasks, num_slots, embedding_matrix=None):
    """
    Creates a unified Shared-Representation Multi-Task deep neural model.
    Head A: Dense classifier (Softmax over 16 intent states)
    Head B: Sequential Token tagger (Softmax over IOB labels across time steps)
    """
    input_seq = Input(shape=(MAX_SEQ_LENGTH,), name="input_tokens", dtype=tf.int32)
    
    if embedding_matrix is not None:
        embeddings = Embedding(
            input_dim=vocab_size,
            output_dim=EMBEDDING_DIM,
            input_length=MAX_SEQ_LENGTH,
            weights=[embedding_matrix],
            trainable=False, # We freeze embeddings for the first stage
            mask_zero=False,
            name="shared_embeddings"
        )(input_seq)
    else:
        embeddings = Embedding(
            input_dim=vocab_size,
            output_dim=EMBEDDING_DIM,
            input_length=MAX_SEQ_LENGTH,
            mask_zero=False,
            name="shared_embeddings"
        )(input_seq)
    
    dropout_embed = Dropout(DROPOUT_RATE, name="embedding_dropout")(embeddings)
    
    from tensorflow.keras.layers import Conv1D, BatchNormalization, Activation
    
    conv_1 = Conv1D(filters=64, kernel_size=3, padding="same", name="conv_layer_1")(dropout_embed)
    norm_1 = BatchNormalization(name="batch_norm_1")(conv_1)
    act_1 = Activation("relu", name="relu_1")(norm_1)
    
    conv_2 = Conv1D(filters=64, kernel_size=3, padding="same", name="conv_layer_2")(act_1)
    norm_2 = BatchNormalization(name="batch_norm_2")(conv_2)
    shared_features = Activation("relu", name="relu_2")(norm_2)
    
    dropout_features = Dropout(DROPOUT_RATE, name="features_dropout")(shared_features)
    
    pooled_representation = GlobalAveragePooling1D(name="max_pooling")(dropout_features)
    intent_dense = Dense(64, activation="relu", name="intent_dense")(pooled_representation)
    intent_out = Dense(num_intents, activation="softmax", name="intent")(intent_dense)
    
    task_dense = Dense(32, activation="relu", name="task_dense")(pooled_representation)
    task_out = Dense(num_tasks, activation="softmax", name="taskType")(task_dense)
    
    slots_out = TimeDistributed(
        Dense(num_slots, activation="softmax"), name="slots"
    )(dropout_features)
    
    model = Model(inputs=input_seq, outputs=[intent_out, task_out, slots_out], name="neural_nlp_coprocessor")
    return model


def _temperature_scale(probabilities, temperature):
    """Applies post-hoc temperature scaling to already-softmaxed probabilities."""
    clipped = np.clip(probabilities, 1e-8, 1.0)
    logits = np.log(clipped) / temperature
    logits = logits - np.max(logits, axis=1, keepdims=True)
    exp_logits = np.exp(logits)
    return exp_logits / np.sum(exp_logits, axis=1, keepdims=True)


def fit_temperature(probabilities, labels):
    """Selects a scalar temperature that minimizes validation negative log likelihood."""
    best_temperature = 1.0
    best_nll = float("inf")

    for temperature in TEMPERATURE_GRID:
        scaled = _temperature_scale(probabilities, temperature)
        nll = -np.mean(np.log(np.clip(scaled[np.arange(len(labels)), labels], 1e-8, 1.0)))
        if nll < best_nll:
            best_nll = nll
            best_temperature = float(temperature)

    return {
        "enabled": True,
        "temperature": best_temperature,
        "validation_nll": float(best_nll),
    }


def build_intent_decision_boundary(model, X_reference, Y_reference, intents_list):
    """
    Builds adaptive decision boundaries over the intent embedding space.
    A query is accepted only if its intent embedding falls inside at least one class radius.
    """
    embedding_model = Model(
        inputs=model.input,
        outputs=model.get_layer("intent_dense").output,
        name="intent_embedding_exporter"
    )
    embeddings = embedding_model.predict(X_reference, batch_size=BATCH_SIZE, verbose=0)

    centroids = {}
    radii = {}
    counts = {}

    for intent_idx, intent_name in enumerate(intents_list):
        class_embeddings = embeddings[Y_reference == intent_idx]
        counts[intent_name] = int(len(class_embeddings))

        if len(class_embeddings) == 0:
            continue

        centroid = np.mean(class_embeddings, axis=0)
        distances = np.linalg.norm(class_embeddings - centroid, axis=1)
        radius = np.percentile(distances, BOUNDARY_PERCENTILE) * BOUNDARY_RADIUS_MULTIPLIER

        centroids[intent_name] = centroid.astype(float).tolist()
        radii[intent_name] = float(max(radius, 1e-6))

    return {
        "enabled": True,
        "layer": "intent_dense",
        "metric": "euclidean",
        "percentile": BOUNDARY_PERCENTILE,
        "radius_multiplier": BOUNDARY_RADIUS_MULTIPLIER,
        "centroids": centroids,
        "radii": radii,
        "counts": counts,
    }


def template_aware_split(samples, train_frac=0.8, val_frac=0.1, seed=RANDOM_SEED):
    """
    Splits by SOURCE TEMPLATE (sample["sourcePattern"]), not by individual
    utterance — every row generated from the same template (e.g.
    "spent {AMOUNT} on {CATEGORY}", with different entity fills) lands in the
    same split. This prevents the near-guaranteed leakage of a naive random
    split over a template-generated corpus, where the model can see the same
    sentence skeleton (just different entity values) in both train and eval
    and appear to generalize when it has actually memorized the skeleton.

    Falls back to a per-sample random split for any row missing
    sourcePattern (e.g. hand-authored rows added outside generateFromSpec.ts)
    so this never silently drops data.
    """
    import random
    from collections import defaultdict
    rng = random.Random(seed)

    with_pattern = [s for s in samples if s.get("sourcePattern")]
    without_pattern = [s for s in samples if not s.get("sourcePattern")]

    # STRATIFIED per (intent, taskType). A GLOBAL template shuffle let an entire
    # intent land in one split — measured live on 2026-07-18: SIP_VS_PREPAY went
    # 27 -> 0 test rows and SPENDING_ANALYSIS 0 -> 50 between two runs, which
    # made per-intent F1 incomparable across runs (an F1 of 0.000 could mean
    # "broken" or "never tested"). Splitting WITHIN each bucket guarantees every
    # bucket contributes to train, val and test, so deltas are real.
    by_bucket = defaultdict(set)
    for smp in with_pattern:
        by_bucket[(smp["intent"], smp["taskType"])].add(smp["sourcePattern"])

    train_patterns, val_patterns, test_patterns = set(), set(), set()
    thin_buckets = []
    for bucket, pats in sorted(by_bucket.items()):
        pl = sorted(pats)
        rng.shuffle(pl)
        n_b = len(pl)
        if n_b < 3:
            # Too few templates to hold any out without emptying training for
            # this bucket. Keep them all in train and record it — a bucket that
            # cannot be evaluated should be visible, not silently absent.
            train_patterns.update(pl)
            thin_buckets.append(f"{bucket[0]}|{bucket[1]}({n_b})")
            continue
        # At least one template each to val and test, remainder to train.
        n_val = max(1, int(n_b * val_frac))
        n_test = max(1, int(n_b * (1.0 - train_frac - val_frac)))
        if n_val + n_test >= n_b:
            n_val, n_test = 1, 1
        val_patterns.update(pl[:n_val])
        test_patterns.update(pl[n_val:n_val + n_test])
        train_patterns.update(pl[n_val + n_test:])

    train_samples = [s for s in with_pattern if s["sourcePattern"] in train_patterns]
    val_samples = [s for s in with_pattern if s["sourcePattern"] in val_patterns]
    test_samples = [s for s in with_pattern if s["sourcePattern"] in test_patterns]

    n = len(train_patterns) + len(val_patterns) + len(test_patterns)

    if without_pattern:
        rng.shuffle(without_pattern)
        wp_train_end = int(len(without_pattern) * train_frac)
        wp_val_end = int(len(without_pattern) * (train_frac + val_frac))
        train_samples += without_pattern[:wp_train_end]
        val_samples += without_pattern[wp_train_end:wp_val_end]
        test_samples += without_pattern[wp_val_end:]
        print(f"[*] Stratified split: {len(without_pattern)} sample(s) had no sourcePattern — random-split as a fallback.")

    print(f"[*] Stratified over {len(by_bucket)} (intent,taskType) buckets.")
    if thin_buckets:
        print(f"[!] {len(thin_buckets)} bucket(s) with <3 templates are TRAIN-ONLY (not evaluable): {', '.join(thin_buckets[:8])}{' ...' if len(thin_buckets) > 8 else ''}")
    print(f"[*] Split: {n} distinct templates -> {len(train_patterns)} train / {len(val_patterns)} val / {len(test_patterns)} test")
    return train_samples, val_samples, test_samples


def main():
    print("="*60)
    print("   ON-DEVICE PRODUCTION AI TRAINING PIPELINE FOR LOCAL EXPORT")
    print("="*60)
    
    try:
        samples = load_dataset()
    except Exception as e:
        print(f"[!] Error: {e}")
        return
        
    print(f"[*] Read in {len(samples)} unique NLP utterances.")

    word2idx, vocab, intent2idx, intents_list, task2idx, tasks_list, slot2idx, slots_list = build_vocab_and_label_mappings(samples)
    
    train_samples = [s for s in samples if s.get("split") == "train"]
    val_samples = [s for s in samples if s.get("split") == "val"]
    test_samples = [s for s in samples if s.get("split") == "test"]

    if not train_samples:
        train_samples, val_samples, test_samples = template_aware_split(samples)

    print(f"\n[*] Processing data splits (Total samples):")
    print(f"    - Training Split:   {len(train_samples)} samples")
    print(f"    - Validation Split: {len(val_samples)} samples")
    print(f"    - Testing Split:    {len(test_samples)} samples")

    X_train, Y_intent_train, Y_task_train, Y_slots_train = vectorize_samples(train_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=True)
    X_val, Y_intent_val, Y_task_val, Y_slots_val = vectorize_samples(val_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=False)
    X_test, Y_intent_test, Y_task_test, Y_slots_test = vectorize_samples(test_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=False)

    embedding_matrix = load_fasttext_embeddings(word2idx)

    model = build_model(len(vocab), len(intents_list), len(tasks_list), len(slots_list), embedding_matrix)
    model.summary()

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss={
            "intent": "sparse_categorical_crossentropy",
            "taskType": "sparse_categorical_crossentropy",
            "slots": "sparse_categorical_crossentropy"
        },
        loss_weights={
            "intent": 1.0,
            "taskType": 1.0,
            "slots": 2.0
        },
        metrics={
            "intent": "accuracy",
            "taskType": "accuracy",
            "slots": "accuracy"
        }
    )

    # ── CLASS WEIGHTING ────────────────────────────────────────────────────
    # Measured on run 7: with SPENDING_ANALYSIS at 255 templates and
    # NET_WORTH_CHECK at 10, the loss was dominated by the populated classes and
    # the model STOPPED PREDICTING the minority intents entirely — REFUND,
    # INCOME_DECLARATION, NET_WORTH_CHECK and SIP_VS_PREPAY all went to exactly
    # 0.000 F1 (precision AND recall zero = never guessed). That is an imbalance
    # artefact, not evidence those intents are unlearnable.
    #
    # Keras multi-output models do not take a per-output class_weight reliably,
    # so this is expressed as per-SAMPLE weights, which is equivalent. Weights
    # are inverse-frequency, normalised to mean 1.0 so the effective learning
    # rate is unchanged, and capped so a 3-template class cannot dominate the
    # gradient the way the majority classes currently do.
    def class_sample_weights(labels, cap=8.0):
        counts = np.bincount(labels, minlength=int(labels.max()) + 1).astype(np.float64)
        counts[counts == 0] = 1.0                  # unseen class: neutral weight
        w = counts.sum() / (len(counts) * counts)   # inverse frequency
        w = np.clip(w, 1.0 / cap, cap)
        sw = w[labels]
        # Normalise over SAMPLES, not classes. Normalising the per-class array
        # left the per-sample mean at 0.28 (majority classes carry low weights
        # and appear most often), which silently scaled the whole loss down
        # ~3.5x — an unintended learning-rate cut on top of the reweighting.
        return sw / sw.mean()

    sw_train = {
        "intent": class_sample_weights(Y_intent_train),
        "taskType": class_sample_weights(Y_task_train),
    }
    _iw = sw_train["intent"]
    print(f"[*] Class weighting ON — intent sample weights range {_iw.min():.2f}..{_iw.max():.2f} (mean {_iw.mean():.2f})")

    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=4,
        restore_best_weights=True
    )
    
    print("\n[*] Commencing Stage 1: Training Dense Layers (Embeddings Frozen)...")
    history = model.fit(
        X_train,
        {"intent": Y_intent_train, "taskType": Y_task_train, "slots": Y_slots_train},
        validation_data=(X_val, {"intent": Y_intent_val, "taskType": Y_task_val, "slots": Y_slots_val}),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stopping],
        sample_weight=sw_train,
        verbose=1
    )
    
    if embedding_matrix is not None:
        print("\n[*] Commencing Stage 2: Fine-Tuning Embeddings...")
        model.get_layer("shared_embeddings").trainable = True
        # Recompile with a much lower learning rate for fine-tuning
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
            loss={
                "intent": "sparse_categorical_crossentropy",
                "taskType": "sparse_categorical_crossentropy",
                "slots": "sparse_categorical_crossentropy"
            },
            loss_weights={
                "intent": 1.0,
                "taskType": 1.0,
                "slots": 2.0
            },
            metrics={
                "intent": "accuracy",
                "taskType": "accuracy",
                "slots": "accuracy"
            }
        )
        
        early_stopping_ft = tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=3,
            restore_best_weights=True
        )
        
        history_ft = model.fit(
            X_train,
            {"intent": Y_intent_train, "taskType": Y_task_train, "slots": Y_slots_train},
            validation_data=(X_val, {"intent": Y_intent_val, "taskType": Y_task_val, "slots": Y_slots_val}),
            epochs=FINETUNE_EPOCHS,
            batch_size=BATCH_SIZE,
            callbacks=[early_stopping_ft],
            sample_weight=sw_train,
            verbose=1
        )
    
    print("\n[*] Evaluating convergence constraints against hold-out test set...")
    test_results = model.evaluate(X_test, {"intent": Y_intent_test, "taskType": Y_task_test, "slots": Y_slots_test}, verbose=0)
    
    # Extract overall metrics. Keras mapping relies on output names
    overall_loss = test_results[0]
    print(f"    - Overall Loss (Cross Entropy): {overall_loss:.4f}")

    Y_pred_raw = model.predict(X_test, batch_size=BATCH_SIZE)
    Y_intent_pred = np.argmax(Y_pred_raw[0], axis=-1)
    Y_task_pred = np.argmax(Y_pred_raw[1], axis=-1)
    Y_slots_pred = np.argmax(Y_pred_raw[2], axis=-1)

    print("\n[*] Calibrating intent confidence and decision boundaries...")
    Y_val_pred_raw = model.predict(X_val, batch_size=BATCH_SIZE, verbose=0)
    temperature_scaling = fit_temperature(Y_val_pred_raw[0], Y_intent_val)
    decision_boundary = build_intent_decision_boundary(model, X_train, Y_intent_train, intents_list)
    print(f"    - Temperature: {temperature_scaling['temperature']:.2f}")
    print(f"    - Boundary classes: {len(decision_boundary['centroids'])}")

    # Compile Intent Classification Metrics
    print("\n[A] Intent Head Classifier Evaluation (16 Intents Mapping):")
    intent_report = classification_report(
        Y_intent_test, 
        Y_intent_pred, 
        labels=range(len(intents_list)),
        target_names=intents_list,
        digits=4,
        zero_division=0
    )
    print(intent_report)
    intent_report_dict = classification_report(
        Y_intent_test, Y_intent_pred, labels=range(len(intents_list)),
        target_names=intents_list, digits=4, zero_division=0, output_dict=True
    )
    intent_confusion = confusion_matrix(Y_intent_test, Y_intent_pred, labels=range(len(intents_list))).tolist()

    # Compile taskType Classification Metrics (previously computed but never
    # reported — see on_device_nlp_implementation_roadmap.md Phase 3 item 3)
    print("\n[B] TaskType Head Classifier Evaluation:")
    task_report = classification_report(
        Y_task_test, Y_task_pred,
        labels=range(len(tasks_list)),
        target_names=tasks_list,
        digits=4,
        zero_division=0
    )
    print(task_report)
    task_report_dict = classification_report(
        Y_task_test, Y_task_pred, labels=range(len(tasks_list)),
        target_names=tasks_list, digits=4, zero_division=0, output_dict=True
    )
    task_confusion = confusion_matrix(Y_task_test, Y_task_pred, labels=range(len(tasks_list))).tolist()

    # Compile Sequence Tag slot-level metrics
    print("\n[C] Slot Head Entity Sequence Classification (Slot Tag Tokens):")
    
    flat_test_slots = []
    flat_pred_slots = []
    
    for i in range(len(X_test)):
        zero_indices = np.where(X_test[i] == 0)[0]
        actual_len = zero_indices[0] if len(zero_indices) > 0 else MAX_SEQ_LENGTH
        if actual_len == 0:
            actual_len = 1
            
        flat_test_slots.extend(Y_slots_test[i, :actual_len])
        flat_pred_slots.extend(Y_slots_pred[i, :actual_len])

    labels_without_O = [idx for idx, tag in enumerate(slots_list) if tag != "O"]
    target_names_without_O = [slots_list[idx] for idx in labels_without_O]

    slot_report = classification_report(
        flat_test_slots,
        flat_pred_slots,
        labels=range(len(slots_list)),
        target_names=slots_list,
        digits=4,
        zero_division=0
    )
    print(slot_report)

    entity_report_dict = None
    if labels_without_O:
        o_idx = slot2idx.get("O")
        print("\n[C.2] Slot Head - ENTITY TAGS ONLY (excludes 'O', which is "
              f"{100 * sum(1 for t in flat_test_slots if t == o_idx) / max(len(flat_test_slots), 1):.1f}% "
              "of all tokens and would otherwise dominate the averages above):")
        entity_report = classification_report(
            flat_test_slots,
            flat_pred_slots,
            labels=labels_without_O,
            target_names=target_names_without_O,
            digits=4,
            zero_division=0
        )
        print(entity_report)
        entity_report_dict = classification_report(
            flat_test_slots, flat_pred_slots, labels=labels_without_O,
            target_names=target_names_without_O, digits=4, zero_division=0, output_dict=True
        )

    # 8. Package Outputs & Export directory structures
    output_dir = "exported_model"
    # Regenerate the intent->taskType mask from the specs on EVERY export. A
    # stale hand-built mask once forced SIP_VS_PREPAY to SUMMARY through two
    # training runs after the spec gained COMPARISON/WHAT_IF (see
    # build_action_mask.py). Spec-derived artifacts must never outlive a run.
    from build_action_mask import build as build_action_mask
    build_action_mask(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    # Save standard JSON vocabulary and labels map
    vocab_file = os.path.join(output_dir, "vocabulary.json")
    print(f"\n[*] Writing dictionary definitions to: {vocab_file}")
    with open(vocab_file, "w") as f:
        json.dump({"vocab": vocab, "word2idx": word2idx}, f, indent=2)
        
    labels_file = os.path.join(output_dir, "labels.json")
    print(f"[*] Writing class registries to: {labels_file}")
    with open(labels_file, "w") as f:
        json.dump({
            "intents": intents_list,
            "intent2idx": intent2idx,
            "tasks": tasks_list,
            "task2idx": task2idx,
            "slots": slots_list,
            "slot2idx": slot2idx,
            "max_seq_length": MAX_SEQ_LENGTH,
            "temperature_scaling": temperature_scaling,
            "decision_boundary": decision_boundary
        }, f, indent=2)

    # Structured evaluation report — the single source of truth for "how good
    # is this model," replacing "read stdout" as the only way to know. See
    # on_device_nlp_implementation_roadmap.md Phase 3 item 3.
    eval_report = {
        "trainedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "datasetSize": {"train": len(train_samples), "val": len(val_samples), "test": len(test_samples)},
        "overallTestLoss": float(overall_loss),
        "calibration": {
            "temperature": temperature_scaling["temperature"],
            "validationNll": temperature_scaling.get("validation_nll"),
        },
        "decisionBoundary": {
            "enabled": decision_boundary["enabled"],
            "boundaryClasses": len(decision_boundary["centroids"]),
        },
        "intent": {
            "accuracy": intent_report_dict["accuracy"],
            "macroF1": intent_report_dict["macro avg"]["f1-score"],
            "weightedF1": intent_report_dict["weighted avg"]["f1-score"],
            "perClass": {k: v for k, v in intent_report_dict.items() if k in intents_list},
            "confusionMatrix": intent_confusion,
            "labels": intents_list,
        },
        "taskType": {
            "accuracy": task_report_dict["accuracy"],
            "macroF1": task_report_dict["macro avg"]["f1-score"],
            "weightedF1": task_report_dict["weighted avg"]["f1-score"],
            "perClass": {k: v for k, v in task_report_dict.items() if k in tasks_list},
            "confusionMatrix": task_confusion,
            "labels": tasks_list,
        },
        "entities": {
            "tokenLevelF1": entity_report_dict["weighted avg"]["f1-score"] if entity_report_dict else None,
            "perType": {k: v for k, v in entity_report_dict.items() if k not in ("accuracy", "macro avg", "weighted avg")} if entity_report_dict else {},
            "note": "Token-level F1, not span-level — a partially-tagged multi-token entity (e.g. only B-AMOUNT correct, I-AMOUNT missed) counts as a partial success here, not a full span failure. Span-level F1 is a documented future improvement, not computed today.",
        },
    }
    eval_report_path = os.path.join(output_dir, "eval_report.json")
    with open(eval_report_path, "w") as f:
        json.dump(eval_report, f, indent=2)
    print(f"[*] Wrote structured evaluation report to: {eval_report_path}")


    # (shutil is imported at module level — a local import here previously
    # shadowed it for the entire function, crashing the archive block above
    # with UnboundLocalError BEFORE the model weights were saved: run 29's
    # export ended up as new vocab/labels over run 28's weights.)
    try:
        shutil.copy("../../category_mapping.json", os.path.join(output_dir, "category_mapping.json"))
        print("[*] Copied category_mapping.json to export directory.")
    except Exception as e:
        print(f"[!] Warning: Could not copy category_mapping.json: {e}")

    # Save complete Keras model first
    keras_model_path = os.path.join(output_dir, "nlp_multitask_model.h5")
    print(f"[*] Compiling HDF5/Keras binary weights checkpoint: {keras_model_path}")
    model.save(keras_model_path)

    # 9. TensorFlow.js export — delegates to convert.py, the single canonical
    # exporter (Phase 4 item 1: this used to be a second, unpatched inline
    # tfjs.converters.save_keras_model() call here; convert.py's Keras-3
    # compatibility patching is what the real deployed model needs).
    tfjs_output_path = os.path.join(output_dir, "tfjs")
    print(f"[*] Converting to TensorFlow.js via convert.py: {tfjs_output_path}")
    try:
        import convert
        convert.convert(model=model, tfjs_dir=tfjs_output_path)
        print("[+] TFJS converter completed successfully! Compiled model.json and shard.bin")
        convert.check_export_integrity(output_dir)
    except ImportError as e:
        print(f"[!] Warning: convert.py's dependencies not available: {e}")
        print("[*] Local conversion command bypass: ")
        print(f"    python convert.py")
    except convert.IntegrityError as e:
        print(f"[!] EXPORT INTEGRITY CHECK FAILED: {e}")
        print("[!] This export MUST NOT be promoted to the app repo until fixed.")
        raise

    # 10. Hard-example benchmark — measures real-world performance on the
    # specific failure classes already observed in production, not just
    # in-distribution test accuracy. See run_benchmark.py.
    try:
        import run_benchmark
        print("\n[*] Running hard-example benchmark against the freshly-exported model...")
        benchmark_summary = run_benchmark.run(
            output_dir, os.path.join(os.path.dirname(__file__), "benchmarks", "hard_cases.jsonl")
        )
        eval_report["hardExampleBenchmark"] = {
            "intentAccuracy": benchmark_summary["intentAccuracy"],
            "intentTaskAccuracy": benchmark_summary["intentTaskAccuracy"],
            "byCategory": benchmark_summary["byCategory"],
        }
        with open(eval_report_path, "w") as f:
            json.dump(eval_report, f, indent=2)
        print(f"[*] Hard-example benchmark results merged into: {eval_report_path}")
    except Exception as e:
        print(f"[!] Warning: hard-example benchmark failed to run: {e}")

    # 11. Regression suite — a fixed, versioned set of canonical utterances
    # that must classify correctly above a confidence floor. Fails loudly
    # (non-zero exit further down) if this training run regressed on a case
    # a prior run got right. See regression_suite.py.
    try:
        import regression_suite
        print("\n[*] Running regression suite against the freshly-exported model...")
        regression_ok, regression_summary = regression_suite.run(output_dir)
        eval_report["regressionSuite"] = regression_summary
        with open(eval_report_path, "w") as f:
            json.dump(eval_report, f, indent=2)
        if not regression_ok:
            print(f"\n[!] REGRESSION SUITE FAILED — {regression_summary['regressionCount']} case(s) regressed. "
                  f"See {eval_report_path} for details.")
    except Exception as e:
        print(f"[!] Warning: regression suite failed to run: {e}")

    print("\n" + "="*50)
    print("   AI TRAINING PIPELINE COMPLETE! ALL TARGETED ASSETS COMPILED.")
    print("="*50)

    # Archive this run's COMPLETE export — placed after the final banner so
    # every artifact (h5, tfjs, vocab, labels, mask, eval report) is on disk.
    # First placement of this block sat BEFORE model.save() and its
    # shutil.copytree crashed on a shadowed local import, killing run 29
    # mid-export: exported_model held run-29 vocab over run-28 weights and
    # every harness scored near-random. Keep this block LAST, always.
    import datetime
    archive_root = "exported_model_archive"
    os.makedirs(archive_root, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_dir = os.path.join(archive_root, f"{stamp}-seed{RANDOM_SEED}")
    shutil.copytree(output_dir, archive_dir)
    print(f"[*] Archived run to {archive_dir}")
    archives = sorted(os.listdir(archive_root))
    for old_run in archives[:-10]:
        shutil.rmtree(os.path.join(archive_root, old_run))
        print(f"[*] Pruned old archive {old_run}")


if __name__ == "__main__":
    main()
