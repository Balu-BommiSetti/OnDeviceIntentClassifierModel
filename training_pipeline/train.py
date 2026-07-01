#!/usr/bin/env python3
"""
On-Device NLP Training Pipeline: Intent Classification & Entity Slot Tracking
Optimized for TensorFlow.js Mobile and WebGL Deployments.
Saves: model.json, weights.bin, vocabulary.json, labels.json

Author: NLP Architect Team
Date: 2026-06-03
"""

import os
os.environ["TF_USE_LEGACY_KERAS"] = "1"
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Embedding, Bidirectional, LSTM, Dense, TimeDistributed, Dropout, GlobalAveragePooling1D
from sklearn.metrics import classification_report, confusion_matrix

# Configuration Constants
MAX_SEQ_LENGTH = 24
EMBEDDING_DIM = 64
LSTM_UNITS = 64
DROPOUT_RATE = 0.3
BATCH_SIZE = 128
EPOCHS = 10
RANDOM_SEED = 42
BOUNDARY_PERCENTILE = 95
BOUNDARY_RADIUS_MULTIPLIER = 1.15
TEMPERATURE_GRID = np.linspace(0.5, 5.0, 46)

tf.random.set_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)


def load_dataset():
    """Reads JSONL dataset from disk."""
    dataset_file = "../exported_dataset/dataset.jsonl"
            
    if not os.path.exists(dataset_file):
        raise FileNotFoundError(
            f"Could not locate {dataset_file}. "
            "Please run the v6 generator script first."
        )
        
    print(f"[*] Loading dataset file: {dataset_file}")
    samples = []
    with open(dataset_file, "r") as f:
        for line in f:
            if line.strip():
                samples.append(json.loads(line))
    return samples

def clean_tokenize(text):
    """Normalized whitespace split with basic punctuation sanitation."""
    text_clean = text.lower().replace(".", " ").replace(",", " ").replace("?", " ").replace("!", " ")
    tokens = [t.strip() for t in text_clean.split() if t.strip()]
    return tokens


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
            word_counts[token] = word_counts.get(token, 0) + 1
        
        unique_intents.add(sample["intent"])
        if "taskType" in sample:
            unique_tasks.add(sample["taskType"])
            
        for tag in sample.get("tags", []):
            unique_slots.add(tag.upper())

    # Sort vocabs by frequency for optimal layout
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
            X[i, j] = word2idx.get(token, word2idx["<UNK>"])
        
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
            if X[i, j] == word2idx.get("<UNK>") and tokens[j] != "<UNK>":
                tag = "O"
            Y_slots[i, j] = slot2idx.get(tag.upper(), slot2idx["O"])
            
    return X, Y_intent, Y_task, Y_slots


def build_model(vocab_size, num_intents, num_tasks, num_slots):
    """
    Creates a unified Shared-Representation Multi-Task deep neural model.
    Head A: Dense classifier (Softmax over 16 intent states)
    Head B: Sequential Token tagger (Softmax over IOB labels across time steps)
    """
    input_seq = Input(shape=(MAX_SEQ_LENGTH,), name="input_tokens", dtype=tf.int32)
    
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
        import random
        random.shuffle(samples)
        train_end = int(len(samples) * 0.8)
        val_end = int(len(samples) * 0.9)
        train_samples = samples[:train_end]
        val_samples = samples[train_end:val_end]
        test_samples = samples[val_end:]
    
    print(f"\n[*] Processing data splits (Total samples):")
    print(f"    - Training Split:   {len(train_samples)} samples")
    print(f"    - Validation Split: {len(val_samples)} samples")
    print(f"    - Testing Split:    {len(test_samples)} samples")

    X_train, Y_intent_train, Y_task_train, Y_slots_train = vectorize_samples(train_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=True)
    X_val, Y_intent_val, Y_task_val, Y_slots_val = vectorize_samples(val_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=False)
    X_test, Y_intent_test, Y_task_test, Y_slots_test = vectorize_samples(test_samples, word2idx, intent2idx, task2idx, slot2idx, is_training=False)

    model = build_model(len(vocab), len(intents_list), len(tasks_list), len(slots_list))
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

    early_stopping = tf.keras.callbacks.EarlyStopping(
        monitor="val_loss",
        patience=4,
        restore_best_weights=True
    )
    
    print("\n[*] Commencing Model Convergence Training...")
    history = model.fit(
        X_train,
        {"intent": Y_intent_train, "taskType": Y_task_train, "slots": Y_slots_train},
        validation_data=(X_val, {"intent": Y_intent_val, "taskType": Y_task_val, "slots": Y_slots_val}),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[early_stopping],
        verbose=1
    )
    
    print("\n[*] Evaluating convergence constraints against hold-out test set...")
    test_results = model.evaluate(X_test, {"intent": Y_intent_test, "taskType": Y_task_test, "slots": Y_slots_test}, verbose=0)
    
    # Extract overall metrics. Keras mapping relies on output names
    overall_loss = test_results[0]
    print(f"    - Overall Loss (Cross Entropy): {overall_loss:.4f}")

    Y_pred_raw = model.predict(X_test, batch_size=BATCH_SIZE)
    Y_intent_pred = np.argmax(Y_pred_raw[0], axis=-1)
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
        labels=labels_without_O,
        target_names=target_names_without_O,
        digits=4,
        zero_division=0
    )
    print(slot_report)

    # 8. Package Outputs & Export directory structures
    output_dir = "exported_model"
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

    import shutil
    try:
        shutil.copy("../category_mapping.json", os.path.join(output_dir, "category_mapping.json"))
        print("[*] Copied category_mapping.json to export directory.")
    except Exception as e:
        print(f"[!] Warning: Could not copy category_mapping.json: {e}")

    # Save complete Keras model first
    keras_model_path = os.path.join(output_dir, "nlp_multitask_model.h5")
    print(f"[*] Compiling HDF5/Keras binary weights checkpoint: {keras_model_path}")
    model.save(keras_model_path)

    # 9. Trigger TensorFlow.js convert pipeline inside Python script
    tfjs_output_path = os.path.join(output_dir, "tfjs")
    print(f"[*] Initiating TensorFlow.js converter bundle at: {tfjs_output_path}")
    
    try:
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(model, tfjs_output_path)
        print("[+] TFJS converter completed successfully! Compiled model.json and shard.bin")
    except ImportError:
        print("[!] Warning: tensorflowjs package not fully installed or registered in environment.")
        print("[*] Local conversion command bypass: ")
        print(f"    tensorflowjs_converter --input_format=keras {keras_model_path} {tfjs_output_path}")
        
    print("\n" + "="*50)
    print("   AI TRAINING PIPELINE COMPLETE! ALL TARGETED ASSETS COMPILED.")
    print("="*50)


if __name__ == "__main__":
    main()
