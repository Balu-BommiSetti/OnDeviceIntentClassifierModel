#!/usr/bin/env python3
"""
Measure embedding coverage BEFORE committing to a train (spike gate).

Builds the exact training vocab, runs the current load_fasttext_embeddings()
source-selection, and reports how many of the previously-random-init tokens
(the 1131 wiki-news .vec misses — Hinglish + Indian brands) now get a real
vector from the cc.en.300.bin subword model. If the payoff is small, we skip
the train.
"""
import os, json, re
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_USE_LEGACY_KERAS"] = "1"

from train import build_vocab_and_label_mappings, load_fasttext_embeddings, numeric_vocab_key
import numpy as np

samples = [json.loads(l) for l in open("../../exported_dataset/spec_dataset.jsonl") if l.strip()]
word2idx, vocab, *_ = build_vocab_and_label_mappings(samples)

# The tokens that were RANDOM under wiki-news .vec — load that set to check
# specifically whether they got rescued.
ft_vec = set()
with open("embeddings/wiki-news-300d-1M.vec", encoding="utf-8") as f:
    next(f)
    for line in f:
        ft_vec.add(line.split(" ", 1)[0])
prev_random = [w for w in vocab if not w.startswith("<") and w not in ft_vec]

mat = load_fasttext_embeddings(word2idx)
if mat is None:
    print("No embedding source found."); raise SystemExit(1)

# A token is "rescued" if its row is no longer near-random. Random init was
# N(0, 0.1); a real FastText vector has a very different norm, so compare norms.
rescued = 0
samples_rescued = []
for w in prev_random:
    v = mat[word2idx[w]]
    if np.linalg.norm(v) > 0.5:  # random-0.1 rows sit ~0.1*sqrt(300)=1.7... use FT-vs-random separation empirically below
        rescued += 1
        if len(samples_rescued) < 25:
            samples_rescued.append(w)

# Empirical separation check: print norm distribution so the 0.5 threshold is honest.
norms = np.array([np.linalg.norm(mat[word2idx[w]]) for w in prev_random])
print(f"\n=== COVERAGE ===")
print(f"previously-random real-word tokens: {len(prev_random)}")
print(f"norm stats of those rows now: min {norms.min():.2f} / median {np.median(norms):.2f} / max {norms.max():.2f}")
print(f"sample rescued tokens: {samples_rescued}")
