import json
from collections import Counter

dataset_file = "../exported_dataset/legacy/combinatorial_dataset.jsonl"  # RETIRED — see legacy/README.md
print(f"Loading {dataset_file}...")
intents = Counter()
tasks = Counter()
splits = Counter()

with open(dataset_file, "r") as f:
    for line in f:
        if line.strip():
            sample = json.loads(line)
            intents[sample.get("intent", "UNKNOWN")] += 1
            tasks[sample.get("taskType", "UNKNOWN")] += 1
            splits[sample.get("split", "train")] += 1

print("\n--- Split Distribution ---")
for s, count in splits.most_common():
    print(f"{s}: {count}")

print("\n--- Intent Distribution ---")
for intent, count in intents.most_common():
    print(f"{intent}: {count}")

print("\n--- Task Distribution ---")
for task, count in tasks.most_common():
    print(f"{task}: {count}")
