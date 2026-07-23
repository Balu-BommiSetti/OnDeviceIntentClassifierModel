#!/usr/bin/env python3
"""
Python NLP Test Offline Inference Runner
Mirrors on-device parsing logic using exported vocabulary, labels, and Keras weights.

Author: NLP Architect Team
Date: 2026-06-03
"""

import os
import json
import re
import numpy as np
import tensorflow as tf

# Settings
EXPORT_DIR = "exported_model"
MAX_SEQ_LENGTH = 64


_CURRENCY_SYMBOLS = re.compile(r"[$₹£€₨]")
_SENTENCE_PUNCT = re.compile(r"(?<!\d)[.,](?!\d)|[?!]")

def clean_tokenize(text):
    """Normalized whitespace split with numeric-aware punctuation handling."""
    text_clean = _CURRENCY_SYMBOLS.sub("", text.lower())
    text_clean = _SENTENCE_PUNCT.sub(" ", text_clean)
    tokens = [t.strip() for t in text_clean.split() if t.strip()]
    return tokens

def numeric_vocab_key(token):
    if not any(c.isdigit() for c in token):
        return token
    digits = re.sub(r"[^0-9]", "", token)
    suffix = re.sub(r"[0-9.,]", "", token)
    has_decimal = "." in token
    return f"<NUM{len(digits)}{'D' if has_decimal else ''}{suffix}>"


def run_inference(text, model, word2idx, char2idx, intents_list, tasks_list, slots_list):
    """
    Simulates high-performance on-device execution:
    1. Preprocesses/Tokenizes text
    2. Converts tokens to vocab index vectors
    3. Runs tensor forward pass through model
    4. Decodes output softmax arrays to literal string labels
    """
    tokens = clean_tokenize(text)
    print(f"\n[Raw Input]    \"{text}\"")
    print(f"[Parsed Tokens] {tokens}")
    
    # 1. Transform raw terms to integer vectors
    X = np.zeros((1, MAX_SEQ_LENGTH), dtype=np.int32)
    MAX_CHAR_LENGTH = 15
    X_chars = np.zeros((1, MAX_SEQ_LENGTH, MAX_CHAR_LENGTH), dtype=np.int32)
    for j, token in enumerate(tokens[:MAX_SEQ_LENGTH]):
        processed_token = numeric_vocab_key(token)
        X[0, j] = word2idx.get(processed_token, word2idx.get("<UNK>", 1))
        for c_idx, ch in enumerate(token[:MAX_CHAR_LENGTH]):
            X_chars[0, j, c_idx] = char2idx.get(ch, char2idx.get("<UNK>", 1))
        
    # 2. Run Forward propagation
    # train.py exports 3 heads in this order: [intent, taskType, slots]
    predictions = model.predict([X, X_chars], verbose=0)
    
    # Argmax over softmax logits
    intent_idx = np.argmax(predictions[0][0])
    predicted_intent = intents_list[intent_idx]
    intent_confidence = float(predictions[0][0][intent_idx])
    
    task_idx = np.argmax(predictions[1][0])
    predicted_task = tasks_list[task_idx]
    task_confidence = float(predictions[1][0][task_idx])

    slots_idxs = np.argmax(predictions[2][0], axis=-1)
    
    print("-" * 50)
    print(f"[PREDICTED INTENT]   {predicted_intent} ({intent_confidence * 100:.2f}% confidence)")
    print(f"[PREDICTED TASKTYPE] {predicted_task} ({task_confidence * 100:.2f}% confidence)")
    print("-" * 50)
    
    # 3. Decode entity slot ranges
    entities = []
    current_entity = None
    
    for idx, token in enumerate(tokens[:MAX_SEQ_LENGTH]):
        tag_idx = slots_idxs[idx]
        tag = slots_list[tag_idx]
        
        if tag.startswith("B-"):
            # Close previous entity context if open
            if current_entity:
                entities.append(current_entity)
            entity_label = tag[2:]
            current_entity = {
                "text": token,
                "label": entity_label,
                "indices": [idx, idx]
            }
        elif tag.startswith("I-") and current_entity:
            entity_label = tag[2:]
            if current_entity["label"] == entity_label:
                current_entity["text"] += f" {token}"
                current_entity["indices"][1] = idx
            else:
                # Label mismatch, close current context
                entities.append(current_entity)
                current_entity = None
        else:
            if current_entity:
                entities.append(current_entity)
                current_entity = None
                
    if current_entity:
        entities.append(current_entity)
        
    print("[EXTRACTED SLOT ENTITIES]")
    if not entities:
        print("  None found.")
    for idx, ent in enumerate(entities):
        print(f"  {idx + 1}. Label: {ent['label']:<15} Value: &ldquo;{ent['text']}&rdquo; (tokens {ent['indices']})")
    print("=" * 60)


def main():
    vocab_file = os.path.join(EXPORT_DIR, "vocabulary.json")
    labels_file = os.path.join(EXPORT_DIR, "labels.json")
    model_file = os.path.join(EXPORT_DIR, "nlp_multitask_model.h5")
    
    if not (os.path.exists(vocab_file) and os.path.exists(labels_file) and os.path.exists(model_file)):
        print(f"[!] Error: Model assets not found in '{EXPORT_DIR}'. Please run train.py first to train and export the model.")
        return

    # Load dictionaries
    with open(vocab_file, "r") as f:
        vocab_data = json.load(f)
        word2idx = vocab_data["word2idx"]
        char2idx = vocab_data.get("char2idx", {})
        
    with open(labels_file, "r") as f:
        label_data = json.load(f)
        intents_list = label_data["intents"]
        tasks_list = label_data["tasks"]
        slots_list = label_data["slots"]
        
    # Load model
    print(f"[*] Restoring network layers from: {model_file} ...")
    model = tf.keras.models.load_model(model_file)
    
    # Run test samples
    test_queries = [
        "spent $45.50 on groceries at Walmart today",
        "salary credited $12000 on June 15 from Google Adsense",
        "set monthly gas budget 5000",
        "can I afford an iPhone 15 for 1200 bucks right now",
        # typos / grammar slips
        "recodr income of 500 for freelance",
        "how much did i eran last month",
        # regional slang
        "dropped a bag on rent this month",
        # multi-turn financial jargon (thin entity coverage)
        "what if I pay 5000 extra on my home loan",
        "save 200000 for vacation by next year",
        "cut tenure to 24 months on my car loan",
        # gibberish / out-of-scope -> should resolve to UNKNOWN
        "asdfgh qwerty",
        "what's the weather today",
    ]
    
    print("\n[*] Starting testing offline inference suite...")
    for query in test_queries:
        run_inference(query, model, word2idx, char2idx, intents_list, tasks_list, slots_list)


if __name__ == "__main__":
    main()
