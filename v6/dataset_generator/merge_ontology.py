import json
import os

ENTITIES_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/entities.json"
CATEGORY_MAP_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/category_mapping.json"

def main():
    if not os.path.exists(ENTITIES_PATH):
        print("entities.json not found!")
        return
        
    with open(ENTITIES_PATH, "r") as f:
        entities = json.load(f)
        
    category_map_llm = entities.get("CATEGORY_MAP", {})
    
    if not category_map_llm:
        print("No CATEGORY_MAP found in entities.json")
        return
        
    # Load existing codebase category map
    codebase_map = {}
    if os.path.exists(CATEGORY_MAP_PATH):
        with open(CATEGORY_MAP_PATH, "r") as f:
            codebase_map = json.load(f)
            
    # Merge LLM-generated synonyms into codebase
    for canonical, synonyms in category_map_llm.items():
        if canonical not in codebase_map:
            codebase_map[canonical] = []
            
        for syn in synonyms:
            syn_lower = syn.lower().strip()
            if syn_lower not in [x.lower() for x in codebase_map[canonical]]:
                codebase_map[canonical].append(syn_lower)
                
    # Save back to codebase
    with open(CATEGORY_MAP_PATH, "w") as f:
        json.dump(codebase_map, f, indent=2)
        
    print(f"Successfully merged new LLM synonyms into {CATEGORY_MAP_PATH}!")

if __name__ == "__main__":
    main()
