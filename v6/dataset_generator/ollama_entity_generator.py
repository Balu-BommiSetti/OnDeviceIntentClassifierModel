import os
import json
import argparse
import requests
from typing import List, Dict, Any

OUTPUT_FILE = "/Users/balubommisetti/Documents/Personal/on-device-nlp-workspace/v6/exported_dataset/entities.json"
OLLAMA_HOST = "http://localhost:11434"
DEFAULT_MODEL = "gpt-oss:20b-cloud"

ENTITY_TYPES = {
    "MERCHANT": "A diverse list of real-world merchants, both global (Amazon, Netflix, Uber) and regional to India, US, UK, UAE, Australia (e.g., DMart, Swiggy, Tesco, Coles, Carrefour).",
    "CATEGORY": "Financial categories for spending/budgeting (e.g., groceries, rent, dining, gym, utilities, pet care).",
    "PAYMENTMETHOD": "Ways to pay (e.g., UPI, credit card, cash, GPay, Apple Pay, bank transfer).",
    "FREQUENCY": "Time frequencies (e.g., daily, weekly, monthly, bi-weekly, every 3 months).",
    "LIABILITYTYPE": "Types of debt or loans (e.g., home loan, personal loan, mortgage, overdraft).",
    "ASSETTYPE": "Types of investments or assets (e.g., FD, mutual fund, stocks, crypto, savings account).",
    "LENDER": "Banks and financial institutions (e.g., HDFC, SBI, Chase, Barclays, Bajaj Finance).",
    "GOALNAME": "Financial goals (e.g., emergency fund, vacation, house down payment, retirement).",
    "SPLITWITH": "People to split expenses with (e.g., friend, roommate, spouse, partner).",
    "SOURCE": "Sources of income (e.g., salary, freelance, rental income, dividend).",
    "CURRENCY": "Currency codes or names (e.g., INR, USD, GBP, AED, bucks, quid, rupees).",
    "DATE": "Natural language date references (e.g., today, yesterday, last night, on 15th March, next Friday).",
    "PERIOD": "Natural language time periods (e.g., last week, last 2 months, since January, Q1).",
    "AMOUNT": "Natural language or exact numbers for money (e.g., 500, 45.50, 10k, 1.5 lakhs, fifty bucks).",
    "INTERESTRATE": "Interest rates (e.g., 7%, 8.5%, twelve percent, around 9%).",
    "TENUREMONTHS": "Loan tenures in months (e.g., 12, 24, 36, 60, 120, 360).",
}

# Some entities are mathematically identical in structure
ALIAS_MAP = {
    "TARGETAMOUNT": "AMOUNT",
    "EXTRAPAYMENT": "AMOUNT",
    "NEWRATE": "INTERESTRATE",
    "TARGETDATE": "DATE",
}

def generate_entity_list(model: str, entity_type: str, description: str, count: int = 150, category_constraints: str = None) -> List[str]:
    print(f"Generating {count} variations for {entity_type} using local Ollama model '{model}'...")
    
    constraint_text = ""
    if category_constraints:
        constraint_text = f"\nCRITICAL CONSTRAINT: You must ONLY generate strings that are synonyms, aliases, or direct instances belonging strictly to the following canonical parent groups: {category_constraints}. Do NOT invent new parent categories outside this list."

    prompt_wrapped = f"""
You are a financial NLP data generator. Generate exactly {count} highly diverse and realistic string values for the entity type: {entity_type}.
Description: {description}
Ensure massive diversity: use slang, typos, formal names, abbreviations, and mix regional variations (US, UK, India, UAE, Australia).{constraint_text}

Output ONLY valid JSON in the following format. Do not include any markdown formatting, just the raw JSON:
{{
  "values": ["val1", "val2", "val3"]
}}
"""
    
    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": model,
                "prompt": prompt_wrapped,
                "stream": False,
                "format": "json"
            },
            timeout=120
        )
        response.raise_for_status()
        raw_output = response.json().get("response", "")
        
        result = json.loads(raw_output)
        values = result.get("values", [])
        print(f"Generated {len(values)} values for {entity_type}.")
        return values
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return []

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help="Local Ollama model to use")
    args = parser.parse_args()
    
    all_entities = {}
    
    # Actual Source of Truth from Categories.ts
    canonical_categories = [
        "Food", "Groceries", "Dining Out", "Food Delivery", "Tea & Coffee", "Snacks",
        "Housing", "Rent", "Home Maintenance", "Society / Maintenance", "Property Tax",
        "Transport", "Fuel", "Public Transport", "Parking & Toll",
        "Utilities", "Electricity Bill", "Water Bill", "Gas Bill", "Internet / Broadband", "Mobile / Phone Bill", "DTH / Cable",
        "Lifestyle", "Subscriptions", "Personal Care", "Clothing", "Pet Care", "Travel", "Electronics / Gadgets", "Kids / Family", "Gifts & Donations", "Entertainment",
        "Healthcare", "Pharmacy", "Doctor / Consultation",
        "Education", "School / Tuition Fees",
        "Debt", "EMI", "Tax", "Credit Card Bill",
        "Investment", "SIP",
        "Insurance", "Goal Funding", "Savings Transfer", "Other Expense"
    ]
    
    canonical_sources = [
        "Salary", "Bonus", "Investment Return", "Freelance", "Rental Income", 
        "Cashback / Rewards", "Gift Received", "Tax Refund", "Interest Income", "Other Income"
    ]
    canonical_payment_methods = ["UPI", "Credit Card", "Debit Card", "Cash", "Net Banking", "Apple Pay", "Google Pay"]
    canonical_frequencies = ["Daily", "Weekly", "Bi-weekly", "Monthly", "Quarterly", "Half-yearly", "Annually", "One-time"]
    canonical_liabilities = ["Home Loan", "Personal Loan", "Education Loan", "Auto Loan", "Credit Card Debt", "Overdraft"]
    canonical_assets = ["Mutual Funds", "Fixed Deposit", "Stocks", "Savings Account", "Crypto", "Real Estate", "Gold", "Bonds"]
    canonical_currencies = ["INR", "USD", "GBP", "EUR", "AED", "AUD", "CAD", "SGD"]
    
    # Load existing if available
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r") as f:
            all_entities = json.load(f)
            
    for ent_type, desc in ENTITY_TYPES.items():
        if ent_type not in all_entities or len(all_entities[ent_type]) < 50:
            try:
                constraints = None
                if ent_type == "CATEGORY":
                    constraints = ", ".join(canonical_categories)
                elif ent_type == "SOURCE":
                    constraints = ", ".join(canonical_sources)
                elif ent_type == "PAYMENTMETHOD":
                    constraints = ", ".join(canonical_payment_methods)
                elif ent_type == "FREQUENCY":
                    constraints = ", ".join(canonical_frequencies)
                elif ent_type == "LIABILITYTYPE":
                    constraints = ", ".join(canonical_liabilities)
                elif ent_type == "ASSETTYPE":
                    constraints = ", ".join(canonical_assets)
                elif ent_type == "CURRENCY":
                    constraints = ", ".join(canonical_currencies)
                    
                # Ask for 150, local models might struggle with huge outputs
                values = generate_entity_list(args.model, ent_type, desc, count=150, category_constraints=constraints)
                if values:
                    all_entities[ent_type] = values
            except Exception as e:
                print(f"Failed to generate {ent_type}: {e}")
                
    # Map aliases
    for alias, target in ALIAS_MAP.items():
        if target in all_entities:
            all_entities[alias] = all_entities[target]
            
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_entities, f, indent=2)
        
    print(f"Successfully saved all entities to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
