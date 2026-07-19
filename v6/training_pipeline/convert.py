"""
Single canonical Keras -> TFJS export path (Phase 4 item 1 —
on_device_nlp_implementation_roadmap.md). train.py previously had its own
inline `tfjs.converters.save_keras_model()` call with none of the Keras-3
compatibility patching below; that duplicate path is now retired in favor of
calling `convert()` from here, so there is exactly one place that produces
tfjs/model.json.

App-repo asset syncing is NOT this module's job — see codegenApp.ts (labels +
route map) and app_sync.py (binary model artifacts), both invoked from
run_pipeline.sh. convert.py's only job is producing a correct, loadable
exported_model/tfjs/ directory from a trained Keras model.
"""
import os
import json
import shutil

MODEL_PATH_DEFAULT = "exported_model/nlp_multitask_model.h5"
TFJS_DIR_DEFAULT = "exported_model/tfjs"


def patch_model_json_for_tfjs_compat(model_json: dict) -> dict:
    """
    Patches a Keras-3-saved model.json for TFJS-layers compatibility:
      1. class_name Functional -> Model
      2. input_layers/output_layers wrapped to the expected nesting depth
      3. inbound_nodes converted from Keras-3's dict format to the legacy
         list format TFJS-layers expects
      4. batch_shape -> batchInputShape on InputLayer configs
      5. TimeDistributed-wrapped Dense weight names (dense/kernel ->
         slots/kernel) corrected to match this model's actual layer name

    Extracted from the original convert.py script so it's independently
    unit-testable and reusable from train.py without a subprocess.
    """
    topology = model_json.get("modelTopology", {})
    model_config = topology.get("model_config", {})

    if model_config.get("class_name") == "Functional":
        model_config["class_name"] = "Model"

    config = model_config.get("config", {})

    if "input_layers" in config:
        input_layers = config["input_layers"]
        if len(input_layers) > 0 and not isinstance(input_layers[0], list):
            config["input_layers"] = [input_layers]

    if "output_layers" in config:
        output_layers = config["output_layers"]
        if len(output_layers) > 0 and isinstance(output_layers[0], str):
            config["output_layers"] = [output_layers]

    if "layers" in config:
        for layer in config["layers"]:
            if "inbound_nodes" in layer:
                inbound_nodes = layer["inbound_nodes"]
                new_inbound = []
                for node in inbound_nodes:
                    if isinstance(node, dict):
                        args = node.get("args", [])
                        kwargs = node.get("kwargs", {})
                        if len(args) > 0 and isinstance(args[0], dict) and args[0].get("class_name") == "__keras_tensor__":
                            tensor_config = args[0].get("config", {})
                            history = tensor_config.get("keras_history", [])
                            if len(history) >= 3:
                                new_inbound.append([[history[0], history[1], history[2], kwargs]])
                    elif isinstance(node, list):
                        if len(node) > 0 and not isinstance(node[0], list):
                            new_inbound.append([node])
                        else:
                            new_inbound.append(node)
                if new_inbound:
                    layer["inbound_nodes"] = new_inbound

            if layer.get("class_name") == "InputLayer":
                layer_config = layer.get("config", {})
                if "batch_shape" in layer_config:
                    layer_config["batchInputShape"] = layer_config.pop("batch_shape")

    if "weightsManifest" in model_json:
        for manifest in model_json["weightsManifest"]:
            for weight in manifest.get("weights", []):
                if weight.get("name") == "dense/kernel":
                    weight["name"] = "slots/kernel"
                elif weight.get("name") == "dense/bias":
                    weight["name"] = "slots/bias"

    return model_json


class IntegrityError(Exception):
    pass


def check_export_integrity(export_dir: str) -> None:
    """
    Export-time integrity check (Phase 4 item 2) — asserts vocabulary.json,
    labels.json, category_mapping.json, and tfjs/model.json are mutually
    consistent. Raises IntegrityError on the first violation found rather
    than silently shipping a broken model.

    This exists because we found exactly this class of bug during Phase 1:
    wealthpilot_native_app/src/ai/model/assets/ had a vocabulary.json (4578
    words) that didn't match its model.json's embedding layer (input_dim
    3580) — a stale, unused duplicate directory, but the kind of drift that
    IS reachable if this check isn't run before every export is trusted.
    """
    vocab_path = os.path.join(export_dir, "vocabulary.json")
    labels_path = os.path.join(export_dir, "labels.json")
    category_mapping_path = os.path.join(export_dir, "category_mapping.json")
    model_json_path = os.path.join(export_dir, "tfjs", "model.json")

    for required in (vocab_path, labels_path, model_json_path):
        if not os.path.exists(required):
            raise IntegrityError(f"Missing required export artifact: {required}")

    with open(vocab_path) as f:
        vocab = json.load(f)
    with open(labels_path) as f:
        labels = json.load(f)
    with open(model_json_path) as f:
        model_json = json.load(f)

    word2idx = vocab.get("word2idx", vocab)
    vocab_size = len(word2idx)

    layers = model_json["modelTopology"]["model_config"]["config"]["layers"]
    embedding_layers = [l for l in layers if "mbedding" in l["class_name"]]
    if not embedding_layers:
        raise IntegrityError("No Embedding layer found in tfjs/model.json — cannot verify vocab/model consistency.")
    embedding_input_dim = embedding_layers[0]["config"]["input_dim"]

    if vocab_size != embedding_input_dim:
        raise IntegrityError(
            f"vocabulary.json has {vocab_size} words but the model's Embedding layer "
            f"input_dim is {embedding_input_dim} — these are from different training runs "
            f"and MUST NOT be shipped together (out-of-range token IDs will crash inference "
            f"or silently corrupt embeddings looked up near the boundary)."
        )

    dense_layers = {l["config"]["name"]: l for l in layers if l["class_name"] == "Dense"}
    if "intent" in dense_layers:
        intent_units = dense_layers["intent"]["config"]["units"]
        if intent_units != len(labels["intents"]):
            raise IntegrityError(
                f"labels.json has {len(labels['intents'])} intents but the model's intent "
                f"output layer has {intent_units} units."
            )
    if "taskType" in dense_layers:
        task_units = dense_layers["taskType"]["config"]["units"]
        if task_units != len(labels["tasks"]):
            raise IntegrityError(
                f"labels.json has {len(labels['tasks'])} tasks but the model's taskType "
                f"output layer has {task_units} units."
            )

    if os.path.exists(category_mapping_path):
        with open(category_mapping_path) as f:
            category_mapping = json.load(f)
        if not isinstance(category_mapping, dict) or len(category_mapping) == 0:
            raise IntegrityError("category_mapping.json exists but is empty or malformed.")

    print(f"[integrity] OK — vocab={vocab_size} matches embedding input_dim={embedding_input_dim}, "
          f"intents={len(labels['intents'])}, tasks={len(labels['tasks'])}.")


def convert(model=None, model_path: str = MODEL_PATH_DEFAULT, tfjs_dir: str = TFJS_DIR_DEFAULT):
    """
    Converts a Keras model to TFJS layers format at tfjs_dir, applying the
    Keras-3 compatibility patch. Pass an in-memory `model` (e.g. straight out
    of train.py's model.fit()) to skip the save/reload round-trip; otherwise
    loads from model_path.
    """
    import tensorflowjs as tfjs
    from tensorflow.keras.models import load_model

    if model is None:
        print(f"Loading Keras model from {model_path}...")
        model = load_model(model_path)

    print(f"Converting to TFJS at {tfjs_dir}...")
    if os.path.exists(tfjs_dir):
        shutil.rmtree(tfjs_dir)
    os.makedirs(tfjs_dir)
    tfjs.converters.save_keras_model(model, tfjs_dir)

    model_json_path = os.path.join(tfjs_dir, "model.json")
    print(f"Patching {model_json_path} for TFJS compatibility...")
    with open(model_json_path, "r") as f:
        model_json = json.load(f)
    model_json = patch_model_json_for_tfjs_compat(model_json)
    with open(model_json_path, "w") as f:
        json.dump(model_json, f, separators=(",", ":"))
    print("Patching complete.")

    return tfjs_dir


if __name__ == "__main__":
    convert()
    check_export_integrity(os.path.dirname(TFJS_DIR_DEFAULT))
