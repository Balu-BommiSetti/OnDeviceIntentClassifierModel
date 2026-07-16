import json
import os
import random
import re

TEMPLATES_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/templates.json"
ENTITIES_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/entities.json"
CATEGORY_MAP_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/category_mapping.json"
OUTPUT_PATH = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/combinatorial_dataset.jsonl"

TARGET_TOTAL_RECORDS = 320000

# Canonical static fallbacks in case we need them
CANONICAL_SOURCES = ["Salary", "Bonus", "Investment Return", "Freelance", "Rental Income", "Cashback / Rewards", "Gift Received", "Tax Refund", "Interest Income", "Other Income"]
CANONICAL_PAYMENTS = ["UPI", "Credit Card", "Debit Card", "Cash", "Net Banking", "Apple Pay", "Google Pay", "PhonePe", "Paytm"]
CANONICAL_FREQUENCIES = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Half-yearly", "Annually", "One-time", "every month", "every week"]
CANONICAL_LIABILITIES = ["Home Loan", "Personal Loan", "Education Loan", "Auto Loan", "Credit Card Debt", "Overdraft"]
CANONICAL_ASSETS = ["Mutual Funds", "Fixed Deposit", "Stocks", "Savings Account", "Crypto", "Real Estate", "Gold", "Bonds", "SIP"]
CANONICAL_CURRENCIES = [""]
ALLOWED_ENTITIES = {"AMOUNT", "MERCHANT", "CATEGORY", "DATE", "PAYMENTMETHOD", "LIABILITYTYPE", "ASSETTYPE", "FREQUENCY", "SOURCE", "CURRENCY", "TARGETAMOUNT", "TARGETDATE", "TENUREMONTHS", "INTERESTRATE", "LENDER", "GOALNAME", "SPLITWITH", "PERIOD", "EXTRAPAYMENT", "NEWRATE"}

def load_category_aliases():
    if not os.path.exists(CATEGORY_MAP_PATH):
        return {}
    with open(CATEGORY_MAP_PATH, "r") as f:
        return json.load(f)

def generate_record(template_string, intent, task_type, entities_db, category_map):
    """
    Takes a template like "{AMOUNT} for {CATEGORY} at {MERCHANT}"
    and injects random values from entities_db OR canonical lists.
    """
    parts = re.split(r'(\{[A-Z]+\})', template_string)
    
    tokens = []
    tags = []
    injected_entities = []
    raw_utterance_parts = []
    
    for part in parts:
        if not part:
            continue
        if part.startswith('{') and part.endswith('}'):
            entity_type = part[1:-1]
            
            if entity_type not in ALLOWED_ENTITIES:
                # Malformed template placeholder (e.g. {LIABI LITYTYPE}), drop it immediately
                return None
                
            # --- ARCHITECTURAL RESOLUTION LOGIC ---
            value = None
            if entity_type == "CATEGORY":
                if category_map:
                    parent = random.choice(list(category_map.keys()))
                    options = category_map[parent] + [parent, parent.lower()]
                    value = random.choice(options)
                else:
                    value = "groceries"
            elif entity_type in entities_db and entities_db[entity_type]:
                value = random.choice(entities_db[entity_type])
            elif entity_type == "SOURCE":
                value = random.choice(CANONICAL_SOURCES)
            elif entity_type == "PAYMENTMETHOD":
                value = random.choice(CANONICAL_PAYMENTS)
            elif entity_type == "FREQUENCY":
                value = random.choice(CANONICAL_FREQUENCIES)
            elif entity_type == "LIABILITYTYPE":
                value = random.choice(CANONICAL_LIABILITIES)
            elif entity_type == "ASSETTYPE":
                value = random.choice(CANONICAL_ASSETS)
            elif entity_type == "CURRENCY":
                value = random.choice(CANONICAL_CURRENCIES)
            else:
                value = f"mock_{entity_type}"
            
            raw_utterance_parts.append(value)
            injected_entities.append({"type": entity_type, "value": value})
            
            # Tokenize the injected value to generate B- and I- tags
            val_tokens = value.split()
            if val_tokens:
                tags.append(f"B-{entity_type}")
                tokens.append(val_tokens[0].lower())
                for vt in val_tokens[1:]:
                    tags.append(f"I-{entity_type}")
                    tokens.append(vt.lower())
        else:
            raw_utterance_parts.append(part)
            # Tokenize the literal part (O tags)
            val_tokens = part.split()
            for vt in val_tokens:
                tags.append("O")
                tokens.append(vt.lower())
                
    utterance = "".join(raw_utterance_parts).strip()
    utterance = re.sub(r'\s+', ' ', utterance)
    
    return {
        "utterance": utterance,
        "intent": intent,
        "taskType": task_type,
        "tokens": tokens,
        "tags": tags,
        "entities": injected_entities
    }

def main():
    if not os.path.exists(TEMPLATES_PATH) or not os.path.exists(ENTITIES_PATH):
        print("Missing templates.json or entities.json. Run extract_templates.py and ollama_entity_generator.py first.")
        return
        
    with open(TEMPLATES_PATH, "r") as f:
        templates_by_intent = json.load(f)
        
    with open(ENTITIES_PATH, "r") as f:
        entities_db = json.load(f)
        
    category_map = load_category_aliases()
        
    total_intents = len(templates_by_intent)
    records_per_intent = TARGET_TOTAL_RECORDS // max(1, total_intents)
    
    print(f"Generating ~{records_per_intent} records per intent bucket using Ground-Truth Categorical Mappings...")
    
    all_records = []
    global_surface_forms = set()
    
    for key, templates in templates_by_intent.items():
        intent, task_type = key.split("::")
        count = 0
        attempts = 0
        max_attempts = records_per_intent * 3
        seen_utterances = set()
        
        while count < records_per_intent and attempts < max_attempts:
            attempts += 1
            template = random.choice(templates)
            
            record = generate_record(template, intent, task_type, entities_db, category_map)
            if not record:
                continue # Template was skipped
            
            utt_key = record["utterance"].lower().strip()
            
            if utt_key not in seen_utterances:
                # Strict check across buckets to avoid contradiction in labels
                if utt_key in global_surface_forms:
                    continue
                global_surface_forms.add(utt_key)
                seen_utterances.add(utt_key)
                all_records.append(record)
                count += 1
                
        print(f"Generated {count} records for {key}")
        
    random.shuffle(all_records)
    
    with open(OUTPUT_PATH, "w") as f:
        for r in all_records:
            f.write(json.dumps(r) + "\n")
            
    print(f"Successfully generated {len(all_records)} mathematically unique records at {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
