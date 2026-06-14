# On-Device Intent Classifier Model Pipeline

This repository contains the end-to-end pipeline for generating personalized finance intent datasets, training an on-device NLP model (Intent Classification & Entity Slot Tracking), and exporting the trained model to TensorFlow.js for web and mobile (React Native) deployments.

## Project Structure

- `src/`: TypeScript source files for dataset generation, intent taxonomies, and entity type definitions.
  - Generates synthetic datasets using LLMs and template-based generators.
  - Outputs JSONL files to be used for model training.
- `training_pipeline/`: Python scripts and training routines.
  - Contains `train.py` for training the Multi-Task Deep Neural Network.
  - Outputs models in HDF5 and TensorFlow.js formats.
- `exported_model/` / `exported_model_v4/`: Contains the generated models, vocabulary mappings, and labels JSONs ready to be imported into front-end apps.
- `public/` & `exported_dataset/`: Directories where the generated dataset variants are saved locally (ignored from source control).

## 1. Generating the Dataset

To generate the training dataset, you can execute the TypeScript generators using `tsx` (included in devDependencies). For example, to run the V4 or V3 dataset generator:

```bash
# Ensure Node dependencies are installed
npm install

# Run the dataset generation script (adjust path based on the version you are testing)
npx tsx src/V4/generateDataset_V4.ts
```

This will produce the `dataset.jsonl` files expected by the training script.

## 2. Training the Model

The training script uses TensorFlow to train a Multi-Task Shared-Representation model (Conv1D + Dense + TimeDistributed) to classify intents and tag entity slots simultaneously.

1. **Set up the Python Environment:**

```bash
cd training_pipeline
python3.11 -m venv .venv11
source .venv11/bin/activate
```

2. **Install Dependencies:**
Make sure you install the required packages (e.g., TensorFlow, TensorFlow.js, scikit-learn, numpy):

```bash
pip install tensorflow tensorflowjs scikit-learn numpy
```

3. **Run the Training Pipeline:**

```bash
python train.py
```

## 3. Model Export & Integration

After `train.py` completes successfully, the assets will be exported to the `training_pipeline/exported_model/` directory.

You will find the following assets:
- `tfjs/model.json` & `tfjs/*.bin`: The TensorFlow.js web-ready bundle.
- `nlp_multitask_model.h5`: The raw Keras checkpoint.
- `vocabulary.json`: The token-to-index mapping dictionary.
- `labels.json`: The mapped intents, tasks, and slots indices.
- `category_mapping.json`: Application-specific categorization map.

You can then load these assets directly into `@tensorflow/tfjs` or `@tensorflow/tfjs-react-native` within your client applications.

## Note on Git Large Files

Large generated files, virtual environments (`.venv11`), and datasets (`*.json`, `*.h5`, `*.bin`) are explicitly excluded via `.gitignore` to prevent Git Large File Storage (LFS) issues and keep the repository lightweight.
