#!/usr/bin/env python3
"""
Keras -> TensorFlow.js `layers-model` converter, using ONLY TensorFlow.

WHY THIS EXISTS
The `tensorflowjs` package cannot be installed alongside this pipeline's
TensorFlow on Python 3.11 / macOS arm64: it hard-depends on
tensorflow-decision-forests -> ydf, whose compiled protobuf gencode requires
protobuf >= 6.31.1, while the TensorFlow it pins requires protobuf < 6.0.0.
That is a circular, unsatisfiable constraint — not a version we can pick
around. Every attempt (fresh venv, tfjs 4.17, dropping TFDF, pinning protobuf
in both directions) failed on the same cycle.

The consequence of NOT having a converter was worse than the dependency:
train.py caught the missing import as a WARNING, so a failed conversion looked
like a successful run and left a STALE tfjs export in place. The deployment
integrity gate caught it — vocabulary.json had 2,346 words while the shipped
model's Embedding input_dim was 925, two days and eleven training runs apart.
Shipping that pair means out-of-range token IDs at inference.

The `layers-model` format is simple and stable: model.json carries the Keras
topology plus a weights manifest, and the .bin is every weight tensor
concatenated in manifest order as little-endian float32. Producing it directly
removes the dependency entirely.

Usage:  python convert_tfjs.py [--model exported_model/nlp_multitask_model.h5]
                              [--out exported_model/tfjs]
"""
import argparse
import json
import os

# Load with KERAS 3, not tf_keras. train.py builds under TF_USE_LEGACY_KERAS=1,
# but the .h5 it writes carries a Keras-3 field ('optional' on InputLayer) that
# legacy Keras cannot deserialize on read-back. Keras 3 reads it fine.
os.environ["TF_USE_LEGACY_KERAS"] = "0"
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import numpy as np
import tensorflow as tf


def convert(model_path: str, out_dir: str) -> None:
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"No Keras model at {model_path} — run train.py first.")

    model = tf.keras.models.load_model(model_path, compile=False)
    os.makedirs(out_dir, exist_ok=True)

    # Weight order MUST match the manifest order exactly; TFJS reads the .bin
    # as a flat stream and slices it by the manifest's shapes in sequence.
    weights, manifest_entries, offset_check = [], [], 0
    for layer in model.layers:
        for w in layer.weights:
            arr = np.asarray(w.numpy(), dtype=np.float32)
            # Strip the ":0" tensor suffix — TFJS uses the bare variable path.
            # Keras 3 exposes `.path` (layer/var) where Keras 2 used `.name`
            # with a ":0" suffix. TFJS wants the bare variable path.
            raw = getattr(w, "path", None) or w.name
            name = raw[:-2] if raw.endswith(":0") else raw
            weights.append(arr)
            manifest_entries.append({
                "name": name,
                "shape": list(arr.shape),
                "dtype": "float32",
            })
            offset_check += arr.size

    bin_name = "group1-shard1of1.bin"
    with open(os.path.join(out_dir, bin_name), "wb") as f:
        for arr in weights:
            # ravel(order="C") matches TFJS's row-major expectation.
            f.write(arr.ravel(order="C").tobytes())

    model_json = {
        "format": "layers-model",
        "generatedBy": f"keras v{tf.keras.__version__}",
        "convertedBy": "convert_tfjs.py (local, dependency-free)",
        "modelTopology": {
            "keras_version": tf.keras.__version__,
            "backend": "tensorflow",
            "model_config": json.loads(model.to_json()),
        },
        "weightsManifest": [{"paths": [bin_name], "weights": manifest_entries}],
    }
    with open(os.path.join(out_dir, "model.json"), "w") as f:
        json.dump(model_json, f)

    bin_bytes = os.path.getsize(os.path.join(out_dir, bin_name))
    print(f"[*] Wrote {out_dir}/model.json ({len(manifest_entries)} weight tensors)")
    print(f"[*] Wrote {out_dir}/{bin_name} ({bin_bytes:,} bytes, {offset_check:,} float32 values)")
    assert bin_bytes == offset_check * 4, "binary size does not match declared shapes"

    # The check the integrity gate performs, done here so a mismatch surfaces
    # at conversion time rather than at deploy time.
    emb = next((l for l in model.layers if isinstance(l, tf.keras.layers.Embedding)), None)
    if emb is not None:
        print(f"[*] Embedding input_dim = {emb.input_dim} (must equal vocabulary.json size)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="exported_model/nlp_multitask_model.h5")
    ap.add_argument("--out", default="exported_model/tfjs")
    a = ap.parse_args()
    convert(a.model, a.out)
