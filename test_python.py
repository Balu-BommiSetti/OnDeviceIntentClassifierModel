import tensorflow as tf
import json
import numpy as np
import re

with open("public/model/labels.json") as f:
    labels = json.load(f)

with open("public/model/vocabulary.json") as f:
    vocab_data = json.load(f)
word2idx = {w: i for i, w in enumerate(vocab_data["vocab"])}

model = tf.keras.models.load_model("public/model/nlp_multitask_model.h5", compile=False)

def numeric_vocab_key(token):
    if not any(c.isdigit() for c in token): return token
    digits = re.sub(r"[^0-9]", "", token)
    suffix = re.sub(r"[0-9.,]", "", token)
    return f"<NUM{len(digits)}{'D' if '.' in token else ''}{suffix}>"

text = "log 200 rs on petrol today"
words = text.split()
seq = np.zeros((1, 64), dtype=np.int32)
for i, w in enumerate(words):
    key = numeric_vocab_key(w)
    seq[0, i] = word2idx.get(key, word2idx["<UNK>"])

preds = model.predict(seq)
intent_pred = preds[0][0]
print(f"Max intent prob: {np.max(intent_pred):.4f} at index {np.argmax(intent_pred)}")
print(f"Intent label: {labels['intents'][np.argmax(intent_pred)]}")
