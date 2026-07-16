import os
import json
import shutil
import tensorflowjs as tfjs
from tensorflow.keras.models import load_model

MODEL_PATH = "exported_model/nlp_multitask_model.keras"
MODEL_PATH = "exported_model/nlp_multitask_model.h5"
TFJS_DIR = "exported_model/tfjs"
WEALTHPILOT_ASSETS_DIR = os.environ.get("ASSETS_DIR", "exported_model/app_assets")

print("Loading Keras model...")
# Provide a dummy implementation for NameMapping if the model requires it for loading,
# but usually saving as .keras preserves enough information, or we can just load it.
# The original file was saved as .keras. Let's load it.
try:
    model = load_model(MODEL_PATH)
except Exception as e:
    # If loading fails due to custom objects, we might need to handle them.
    # Assuming standard layers are used based on train.py
    print(f"Error loading model: {e}")
    exit(1)

print("Converting to TFJS...")
if os.path.exists(TFJS_DIR):
    shutil.rmtree(TFJS_DIR)
os.makedirs(TFJS_DIR)

tfjs.converters.save_keras_model(model, TFJS_DIR)

# Auto-patch model.json for TFJS Keras 3 compatibility
model_json_path = os.path.join(TFJS_DIR, "model.json")
print(f"Patching {model_json_path} for TFJS compatibility...")

with open(model_json_path, 'r') as f:
    model_json = json.load(f)

# Patching logic
model_config = model_json.get("modelTopology", {}).get("keras_version", "unknown")
print(f"Original Keras Version in topology: {model_config}")

topology = model_json.get("modelTopology", {})
model_config = topology.get("model_config", {})

# 1. Class name Functional -> Model
if model_config.get("class_name") == "Functional":
    model_config["class_name"] = "Model"

config = model_config.get("config", {})

# 2. Input layers wrapping
if "input_layers" in config:
    input_layers = config["input_layers"]
    if len(input_layers) > 0 and not isinstance(input_layers[0], list):
        config["input_layers"] = [input_layers]

# 3. Output layers wrapping
if "output_layers" in config:
    output_layers = config["output_layers"]
    # Usually it's a list of arrays. If it's just a 1D array of strings, wrap it.
    if len(output_layers) > 0 and isinstance(output_layers[0], str):
        config["output_layers"] = [output_layers]
    # For multiple outputs, it might be a list of lists already, or a list of objects.
    elif len(output_layers) > 0 and isinstance(output_layers[0], list) and len(output_layers[0]) > 0 and not isinstance(output_layers[0][0], list) and not isinstance(output_layers[0], str):
         # If it's a list of lists of strings/ints. We want a 2D array: [ ["name", 0, 0] ]
         # If it's [["intent", 0, 0], ["taskType", 0, 0]] it is fine.
         # But if it was `["intent", 0, 0]` and got interpreted as multiple, let's just make sure it's 2D.
         pass

# 4. Inbound nodes format and batchInputShape
if "layers" in config:
    for layer in config["layers"]:
        # Fix inbound nodes
        if "inbound_nodes" in layer:
            inbound_nodes = layer["inbound_nodes"]
            new_inbound = []
            for node in inbound_nodes:
                if isinstance(node, dict):
                    # Keras 3 format
                    args = node.get("args", [])
                    kwargs = node.get("kwargs", {})
                    if len(args) > 0 and isinstance(args[0], dict) and "class_name" in args[0] and args[0]["class_name"] == "__keras_tensor__":
                        tensor_config = args[0].get("config", {})
                        history = tensor_config.get("keras_history", [])
                        if len(history) >= 3:
                            new_inbound.append([[history[0], history[1], history[2], kwargs]])
                elif isinstance(node, list):
                    # Legacy or already correct
                    # If it's [["name", 0, 0, {}]] it's correct.
                    # If it's ["name", 0, 0, {}], wrap it.
                    if len(node) > 0 and not isinstance(node[0], list):
                        new_inbound.append([node])
                    else:
                        new_inbound.append(node)
            if new_inbound:
                layer["inbound_nodes"] = new_inbound
                
        # Fix batchInputShape
        if layer.get("class_name") == "InputLayer":
            layer_config = layer.get("config", {})
            if "batch_shape" in layer_config:
                layer_config["batchInputShape"] = layer_config.pop("batch_shape")

# 5. Fix weightsManifest names for TimeDistributed wrapped layers
if "weightsManifest" in model_json:
    for manifest in model_json["weightsManifest"]:
        if "weights" in manifest:
            for weight in manifest["weights"]:
                if weight.get("name") == "dense/kernel":
                    weight["name"] = "slots/kernel"
                elif weight.get("name") == "dense/bias":
                    weight["name"] = "slots/bias"

with open(model_json_path, 'w') as f:
    json.dump(model_json, f, separators=(',', ':'))

print("Patching complete.")

print("Copying artifacts to WealthPilot...")
if not os.path.exists(WEALTHPILOT_ASSETS_DIR):
    os.makedirs(WEALTHPILOT_ASSETS_DIR)

# Copy tfjs files
for file_name in os.listdir(TFJS_DIR):
    full_file_name = os.path.join(TFJS_DIR, file_name)
    if os.path.isfile(full_file_name):
        shutil.copy(full_file_name, WEALTHPILOT_ASSETS_DIR)

# Copy dictionaries
for dict_file in ["vocabulary.json", "labels.json", "category_mapping.json"]:
    src = os.path.join("exported_model", dict_file)
    if os.path.exists(src):
        shutil.copy(src, WEALTHPILOT_ASSETS_DIR)

print(f"Successfully copied all model assets to {WEALTHPILOT_ASSETS_DIR}")
