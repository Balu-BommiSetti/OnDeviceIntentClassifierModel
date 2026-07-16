import json
import os
import re

DATASET_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/dataset.jsonl"
OUTPUT_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/templates.json"

def extract_templates():
    if not os.path.exists(DATASET_PATH):
        print(f"Error: {DATASET_PATH} not found.")
        return

    templates_by_intent = {}
    
    with open(DATASET_PATH, "r") as f:
        for line in f:
            if not line.strip(): continue
            record = json.loads(line)
            
            intent = record.get("intent")
            task_type = record.get("taskType", "NONE")
            tokens = record.get("tokens", [])
            tags = record.get("tags", [])
            
            if not intent or not tokens or not tags:
                continue
                
            key = f"{intent}::{task_type}"
            if key not in templates_by_intent:
                templates_by_intent[key] = set()
                
            template_parts = []
            current_entity = None
            
            for token, tag in zip(tokens, tags):
                if tag.startswith("B-"):
                    entity_type = tag[2:]
                    if current_entity != entity_type:
                        template_parts.append(f"{{{entity_type}}}")
                        current_entity = entity_type
                elif tag.startswith("I-"):
                    # Continue the same entity, don't append a new placeholder
                    continue
                else:
                    template_parts.append(token)
                    current_entity = None
            
            # Re-join string (we'll lose original exact punctuation, but we can fix that later or just use spaced string)
            # This is okay for LLM templates because we can run a quick regex to fix spaces around punctuation
            raw_template = " ".join(template_parts)
            # Basic punctuation cleanup
            raw_template = re.sub(r' ([.,?!])', r'\1', raw_template)
            
            templates_by_intent[key].add(raw_template)

    # Convert sets to lists
    final_templates = {k: list(v) for k, v in templates_by_intent.items()}
    
    with open(OUTPUT_PATH, "w") as f:
        json.dump(final_templates, f, indent=2)
        
    print(f"Extracted {sum(len(v) for v in final_templates.values())} unique templates across {len(final_templates)} intent/task categories.")
    print(f"Saved to {OUTPUT_PATH}")

if __name__ == "__main__":
    extract_templates()
