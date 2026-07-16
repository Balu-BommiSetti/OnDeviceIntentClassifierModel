import os
import json
import argparse
import requests
from typing import List, Dict, Any

OUTPUT_FILE = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/entities.json"
OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "gpt-oss:20b-cloud"

def generate_mapped_entities(model: str, entity_type: str, canonical_keys: list) -> dict:
    print(f"Generating mapped variations for {entity_type} using '{model}'...")
    
    prompt = f"""
You are an expert financial linguist. I will provide a list of canonical {entity_type} names.
For EACH canonical name, generate exactly 5-10 highly diverse, natural language synonyms, slang words, typos, or regional variations (US, UK, India) that a regular user would say.

Canonical list: {json.dumps(canonical_keys)}

Output ONLY valid JSON in the exact format shown below. Do not include any markdown or explanation.
{{
  "{canonical_keys[0]}": ["synonym1", "synonym2"],
  "{canonical_keys[1]}": ["synonym1", "synonym2"]
}}
"""
    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False, "format": "json"},
            timeout=180
        )
        response.raise_for_status()
        raw = response.json().get("response", "{}")
        return json.loads(raw)
    except Exception as e:
        print(f"Error generating {entity_type}: {e}")
        return {}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL)
    args = parser.parse_args()
    
    canonical_categories = [
        "Groceries", "Dining Out", "Food Delivery", "Tea & Coffee", "Snacks",
        "Rent", "Home Maintenance", "Society / Maintenance", "Property Tax",
        "Fuel", "Public Transport", "Parking & Toll",
        "Electricity Bill", "Water Bill", "Gas Bill", "Internet / Broadband", "Mobile / Phone Bill", "DTH / Cable",
        "Subscriptions", "Personal Care", "Clothing", "Pet Care", "Travel", "Electronics / Gadgets", "Kids / Family", "Gifts & Donations", "Entertainment",
        "Pharmacy", "Doctor / Consultation", "School / Tuition Fees", "EMI", "Tax", "Credit Card Bill",
        "SIP", "Goal Funding", "Savings Transfer", "Other Expense"
    ]
    
    canonical_sources = [
        "Salary", "Bonus", "Investment Return", "Freelance", "Rental Income", 
        "Cashback / Rewards", "Gift Received", "Tax Refund", "Interest Income", "Other Income"
    ]
    
    canonical_liabilities = ["Home Loan", "Personal Loan", "Education Loan", "Auto Loan", "Credit Card Debt", "Overdraft"]
    
    canonical_assets = ["Mutual Funds", "Fixed Deposit", "Stocks", "Savings Account", "Crypto", "Real Estate", "Gold", "Bonds"]
    
    # Load existing to preserve Unbounded entities
    all_entities = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r") as f:
            all_entities = json.load(f)
            
    # Generate bounded mapped entities
    all_entities["CATEGORY_MAP"] = generate_mapped_entities(args.model, "Categories", canonical_categories)
    all_entities["SOURCE_MAP"] = generate_mapped_entities(args.model, "Income Sources", canonical_sources)
    all_entities["LIABILITY_MAP"] = generate_mapped_entities(args.model, "Liabilities", canonical_liabilities)
    all_entities["ASSET_MAP"] = generate_mapped_entities(args.model, "Assets", canonical_assets)
    
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entities, f, indent=2)
        
    print("Done! Saved mapped entities to entities.json.")

if __name__ == "__main__":
    main()
