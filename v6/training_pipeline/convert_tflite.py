#!/usr/bin/env python3
"""
Keras (.h5) -> TensorFlow Lite converter — SPIKE for Path 2 (native TFLite
runtime via react-native-fast-tflite instead of tfjs-react-native CPU backend).

This is a scoping spike, not a production pipeline change. It does NOT wire
into app_sync.py or the app. It exists to answer one question empirically:
does this specific exported model (nlp_multitask_model.h5, 3-head Conv1D/
BatchNorm/Dense/TimeDistributed architecture — see train.py build_model())
convert cleanly to TFLite with BUILTIN ops only, at what size, with what op
set?

Loads with tf_keras (legacy Keras 2), same as convert_tfjs.py, for the same
reason: the .h5 was saved by a Keras-3-shaped save path and needs the
InputLayer 'optional' kwarg stripped before legacy Keras will deserialize it.

Usage: python convert_tflite.py [--model exported_model/nlp_multitask_model.h5]
                                 [--out exported_model/tflite/model.tflite]
"""
import argparse
import os

os.environ["TF_USE_LEGACY_KERAS"] = "1"
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import tensorflow as tf
import tf_keras


def _patch_inputlayer_for_keras3_h5() -> None:
    orig = tf_keras.layers.InputLayer.__init__

    def patched(self, *args, **kwargs):
        kwargs.pop("optional", None)
        orig(self, *args, **kwargs)

    tf_keras.layers.InputLayer.__init__ = patched


def convert(model_path: str, out_path: str) -> None:
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"No Keras model at {model_path} — run train.py first.")

    _patch_inputlayer_for_keras3_h5()
    model = tf_keras.models.load_model(model_path, compile=False)

    print(f"[*] Loaded model: {model.name}")
    print(f"[*] Inputs:  {[(i.name, i.shape, i.dtype) for i in model.inputs]}")
    print(f"[*] Outputs: {[(o.name, o.shape, o.dtype) for o in model.outputs]}")
    print("[*] Layer types present:", sorted({type(l).__name__ for l in model.layers}))

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # --- Attempt 1: pure BUILTIN ops (no SELECT_TF_OPS fallback) ---------
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    builtin_only_ok = True
    tflite_model = None
    try:
        tflite_model = converter.convert()
        print("[*] BUILTIN-ONLY conversion: SUCCESS")
    except Exception as e:
        builtin_only_ok = False
        print(f"[!] BUILTIN-ONLY conversion FAILED: {type(e).__name__}: {e}")
        print("[*] Retrying with SELECT_TF_OPS fallback enabled...")
        converter2 = tf.lite.TFLiteConverter.from_keras_model(model)
        converter2.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS,
            tf.lite.OpsSet.SELECT_TF_OPS,
        ]
        tflite_model = converter2.convert()
        print("[*] SELECT_TF_OPS conversion: SUCCESS")

    with open(out_path, "wb") as f:
        f.write(tflite_model)

    size_bytes = os.path.getsize(out_path)
    print(f"[*] Wrote {out_path} ({size_bytes:,} bytes, {size_bytes/1024/1024:.2f} MB)")
    print(f"[*] builtin_ops_only = {builtin_only_ok}")

    # --- Inspect resulting op set via the interpreter ---------------------
    interpreter = tf.lite.Interpreter(model_path=out_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print(f"[*] Interpreter inputs: {len(input_details)}")
    for d in input_details:
        print(f"    - {d['name']}: shape={d['shape']}, dtype={d['dtype']}")
    print(f"[*] Interpreter outputs: {len(output_details)}")
    for d in output_details:
        print(f"    - {d['name']}: shape={d['shape']}, dtype={d['dtype']}")

    # Enumerate the actual op set used in the graph (works across TF versions
    # without depending on the newer tf.lite.experimental.Analyzer API).
    try:
        import numpy as np
        # Analyzer gives the authoritative per-op listing when available.
        tf.lite.experimental.Analyzer.analyze(model_path=out_path)
    except Exception as e:
        print(f"[!] Analyzer unavailable/failed ({e}); op list from flatbuffer below.")

    try:
        from tensorflow.lite.python import schema_py_generated as schema_fb
        with open(out_path, "rb") as f:
            buf = f.read()
        m = schema_fb.Model.GetRootAsModel(buf, 0)
        opcodes = set()
        for i in range(m.OperatorCodesLength()):
            oc = m.OperatorCodes(i)
            builtin_code = oc.DeprecatedBuiltinCode()
            custom_code = oc.CustomCode()
            if custom_code:
                opcodes.add(f"CUSTOM:{custom_code.decode('utf-8', 'ignore')}")
            else:
                # BuiltinOperator enum name lookup
                from tensorflow.lite.python import schema_py_generated as s
                name = None
                for attr in dir(s.BuiltinOperator):
                    if not attr.startswith("_") and getattr(s.BuiltinOperator, attr) == builtin_code:
                        name = attr
                        break
                opcodes.add(name or f"BUILTIN_CODE_{builtin_code}")
        print(f"[*] Op set ({len(opcodes)} unique): {sorted(opcodes)}")
    except Exception as e:
        print(f"[!] Raw flatbuffer op enumeration failed: {e}")

    # --- Quick sanity inference smoke test ---------------------------------
    import numpy as np
    dummy = np.zeros(input_details[0]["shape"], dtype=input_details[0]["dtype"])
    interpreter.set_tensor(input_details[0]["index"], dummy)
    interpreter.invoke()
    outs = [interpreter.get_tensor(d["index"]) for d in output_details]
    print(f"[*] Smoke-test invoke OK. Output shapes: {[o.shape for o in outs]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="exported_model/nlp_multitask_model.h5")
    ap.add_argument("--out", default="exported_model/tflite/model.tflite")
    a = ap.parse_args()
    convert(a.model, a.out)
