#!/usr/bin/env python3
"""
ollama_generate.py — WealthPilot Synthetic Dataset Generator
=============================================================
Reads intent specification files from ../src/knowledge/specs/*.intent.json and
uses a local Ollama model to generate diverse financial NLP training data.

Usage:
    python ollama_generate.py                     # generate for all intents
    python ollama_generate.py --intent ADD_EXPENSE # single intent only
    python ollama_generate.py --count 50           # 50 utterances per action
    python ollama_generate.py --dry-run            # preview prompts, no LLM calls
"""

from __future__ import annotations

import argparse
import glob
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Paths (relative to this script's directory)
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
SPECS_DIR = SCRIPT_DIR / ".." / ".." / "src" / "knowledge" / "specs"
OUTPUT_DIR = SCRIPT_DIR / ".." / "exported_dataset"
OUTPUT_FILE = OUTPUT_DIR / "llm_raw_dataset_v2.jsonl"

# ---------------------------------------------------------------------------
# Ollama defaults
# ---------------------------------------------------------------------------
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_CHAT_ENDPOINT = f"{OLLAMA_BASE_URL}/api/chat"
DEFAULT_MODEL = "gpt-oss:20b-cloud"
DEFAULT_TEMPERATURE = 0.9
DEFAULT_NUM_CTX = 4096
DEFAULT_COUNT = 30
MAX_RETRIES = 3
INITIAL_BACKOFF_SECONDS = 2

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ollama_generate")


# ═══════════════════════════════════════════════════════════════════════════
# Entity diversity reference (embedded in the system prompt)
# ═══════════════════════════════════════════════════════════════════════════
ENTITY_DIVERSITY_GUIDE = """\
### Entity-Value Diversity Requirements

- **AMOUNT**: Exact numbers (500, 45.50), shorthand (10k, 50k, 1M), Indian notation \
(1.5 lakhs, 2 crores), word-based (fifty bucks, two grand), with/without currency \
symbols ($, ₹, £, AED). Include decimals, rounded values, and rough estimates \
("around 500", "roughly 10k").
- **DATE**: today, yesterday, last night, on Monday, on 15th March, 3 days ago, \
last Tuesday, this morning, 2025-06-01, next Friday.
- **PERIOD**: last week, last 2 months, this year, since January, Q1, past 6 months, \
from March to June, fiscal year 2025, YTD.
- **MERCHANT**: Mix of global (Amazon, Netflix, Uber, Starbucks, Walmart, Apple) + \
regional (DMart, Swiggy, Zomato, Flipkart, BigBazaar, Lulu, Tesco, Aldi, Coles, Carrefour, \
Sharaf DG, Noon, JioMart, Blinkit).
- **CATEGORY**: groceries, rent, fuel, dining, gym, entertainment, utilities, education, \
insurance, medicine, travel, clothing, subscriptions, electronics, home improvement, \
pet care, gifts, charity, personal care, transportation.
- **PAYMENT_METHOD**: UPI, credit card, debit card, cash, GPay, PhonePe, Paytm, \
Apple Pay, bank transfer, NEFT, IMPS, PayPal, Venmo, Zelle, cash on delivery, \
tap-to-pay, cheque, net banking, autopay.
- **FREQUENCY**: daily, weekly, monthly, yearly, quarterly, bi-weekly, fortnightly, \
every 3 months, annually, twice a month.
- **INTERESTRATE**: 7%, 8.5%, twelve percent, 6.25 percent, around 9%.
- **LIABILITYTYPE**: home loan, personal loan, car loan, education loan, credit card debt, \
mortgage, student loan, auto loan, business loan, overdraft.
- **ASSETTYPE**: FD, mutual fund, stocks, gold, real estate, PPF, NPS, crypto, bonds, \
savings account, SIP, ELSS, ETF, REIT.
- **LENDER**: HDFC, SBI, ICICI, Axis Bank, Bank of America, Chase, Barclays, HSBC, \
Kotak, Bajaj Finance, Wells Fargo, NAB, CBA, Emirates NBD.
- **GOALNAME**: emergency fund, vacation, car, house down payment, wedding, education, \
retirement, new laptop, Europe trip, kids' school fees, home renovation.
- **TARGETAMOUNT**: Same diversity as AMOUNT — exact, shorthand, lakhs/crores, word-based.
- **TARGETDATE**: December 2026, by next year, in 2 years, March 2027, end of this year, \
by my birthday (December), before Diwali 2026.
- **EXTRAPAYMENT**: Same diversity as AMOUNT.
- **TENUREMONTHS**: 12, 24, 36, 60, 120, 180, 240, 360.
- **SPLITWITH**: friend, roommate, spouse, colleague, brother, sister, flatmate, partner.
- **SOURCE**: salary, freelance, rental income, bonus, dividend, side hustle, inheritance, \
gift, investment returns, part-time job, consulting.
- **CURRENCY**: INR, USD, GBP, AED, AUD, EUR, SGD, CAD, JPY.
- **NEWRATE**: Same diversity as INTERESTRATE.

### Regional Speaking Styles
- **US**: "dropped 50 bucks on lunch", "blew 200 on sneakers", "threw down 500 for rent"
- **UK**: "splashed out 40 quid on pints", "spent a tenner at Tesco"
- **India**: "bhai 500 rupay ki grocery", "yaar 2 lakh ka loan", "paytm se 300 diya"
- **UAE**: "habibi 500 dirhams on groceries", "paid 1000 AED for flight"
- **Australia**: "mate dropped 80 bucks at Woolies", "chucked 200 on the pokies"
"""


# ═══════════════════════════════════════════════════════════════════════════
# Prompt builders
# ═══════════════════════════════════════════════════════════════════════════

def build_system_prompt() -> str:
    """System-level prompt shared by every generation call."""
    return f"""\
You are a **synthetic data generator** for WealthPilot, an on-device personal-finance \
assistant app.  Your sole task is to produce realistic, diverse training utterances that \
a real user might say or type into the app.

Rules you MUST follow:
1. Output **only** a JSON array — no explanation, no markdown fences, no extra keys.
2. Each element must be an object with exactly these keys:
   - "utterance" (string) — the natural-language text the user would say/type.
   - "intent"    (string) — the intent label (provided to you).
   - "taskType"  (string) — the action label (provided to you).
   - "entities"  (array)  — extracted entities, each with "type" and "value".
     Entity "type" values must be UPPERCASE with no underscores between words \
(e.g. PAYMENTMETHOD, LIABILITYTYPE, INTERESTRATE, ASSETTYPE, TARGETAMOUNT, \
TARGETDATE, EXTRAPAYMENT, TENUREMONTHS, SPLITWITH, GOALNAME, NEWRATE).
3. Vary along ALL of these dimensions:
   - **Style**: formal, casual, slang, abbreviation-heavy, voice-dictated (with \
filler words / typos / no punctuation).
   - **Region**: US English, UK English, Indian English, Australian English, \
UAE English — mix in culturally authentic slang.
   - **Complexity**: simple (1–2 entities), medium (3 entities), complex (4+ entities).
   - **Edge cases**: partial info, ambiguous phrasing, code-switching, \
numbers as words, missing punctuation, emojis 💸.
4. Entity values must be **diverse** — never repeat the same value more than twice.
5. Do NOT include entities in the output that are not actually mentioned in the utterance.
6. Keep utterances under 40 words.

{ENTITY_DIVERSITY_GUIDE}
"""


def build_user_prompt(
    spec: dict[str, Any],
    action: str,
    count: int,
) -> str:
    """Per-(intent, action) user prompt with seed patterns."""
    intent = spec["intent"]
    description = spec.get("description", "")
    required = spec.get("required_entities", [])
    optional = spec.get("optional_entities", [])
    patterns = spec.get("utterance_patterns", {}).get(action, [])

    # Pick up to 3 seed patterns
    seed_examples = patterns[:3]
    seed_block = "\n".join(f"  - \"{p}\"" for p in seed_examples)

    # Inject a random style modifier to force diversity on every batch
    # Weighted: 60% proper/standard English, 40% noisy/edge-case
    style_modifiers = [
        # --- Proper / Standard English (60% probability) ---
        "Write in standard, grammatically correct conversational English.",
        "Write in a highly professional, polite tone.",
        "Write as a clear, concise question in perfect English.",
        "Write a detailed, well-structured financial query.",
        "Write formally, as if speaking to a human wealth manager.",
        "Write a standard, natural, but grammatically correct request.",
        # --- Noisy / Edge Cases (40% probability) ---
        "Write as if a user is texting quickly on a phone with lots of typos.",
        "Write as if the user is dictating via voice-to-text with filler words (uh, um, like).",
        "Write using heavy regional slang (e.g., UAE 'habibi', India 'bhai', UK 'mate').",
        "Write a long, rambling paragraph where the actual intent is buried at the end."
    ]
    import random
    current_style = random.choice(style_modifiers)

    return f"""\
Generate **{count}** diverse utterances for the WealthPilot app.

**Intent**: {intent}
**Description**: {description}
**Action / Task Type**: {action}
**Required entities**: {json.dumps(required)}
**Optional entities**: {json.dumps(optional)}

Seed patterns (for inspiration — do NOT copy verbatim):
{seed_block}

Return a JSON array of {count} objects. Example element:
{{
  "utterance": "bhai last month I blew around 45k on groceries at DMart using UPI",
  "intent": "{intent}",
  "taskType": "{action}",
  "entities": [
    {{"type": "AMOUNT", "value": "45k"}},
    {{"type": "CATEGORY", "value": "groceries"}},
    {{"type": "MERCHANT", "value": "DMart"}},
    {{"type": "PAYMENTMETHOD", "value": "UPI"}}
  ]
}}

Remember:
- CRITICAL INSTRUCTION: {current_style}
- Vary style (formal ↔ slang ↔ voice-dictated), region, entity values, and complexity.
- Include edge cases: typos, partial info, code-switching, emojis.
- Each utterance must be UNIQUE and feel like something a real human would say.
- Output ONLY the JSON array. No markdown, no explanation.
"""


def build_unknown_prompt(count: int) -> str:
    """Separate prompt for UNKNOWN / out-of-domain utterances."""
    return f"""\
Generate **{count}** diverse UNKNOWN / out-of-domain utterances — things a user might \
type into WealthPilot that are NOT related to personal finance.

Categories to cover:
- Gibberish / keyboard mashing ("asdfghjkl", "qwerty", "xxx")
- Greetings ("hello", "hi there", "good morning!", "hey buddy")
- General knowledge ("what's the weather", "who won the match", "tell me a joke")
- App confusion ("play music", "set an alarm", "navigate to the mall")
- Vague / meta ("help", "what can you do", "idk", "just testing")
- Small talk ("how are you", "thanks", "ok bye", "never mind")
- Mixed language ("kya hal hai", "comment ça va", "como estás")
- Emojis only ("😂😂", "🔥", "👍")

Return a JSON array of {count} objects, each with:
- "utterance" — the non-financial text
- "intent" — always "UNKNOWN"
- "taskType" — always "NONE"
- "entities" — always an empty array []

Output ONLY the JSON array. No markdown, no explanation.
"""


# ═══════════════════════════════════════════════════════════════════════════
# Ollama interaction
# ═══════════════════════════════════════════════════════════════════════════

def check_ollama_server() -> bool:
    """Return True if Ollama is reachable."""
    try:
        resp = requests.get(OLLAMA_BASE_URL, timeout=5)
        return resp.status_code == 200
    except requests.ConnectionError:
        return False
    except Exception:
        return False


def call_ollama(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    num_ctx: int = DEFAULT_NUM_CTX,
) -> str:
    """Send a chat completion request to Ollama and return assistant text."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_ctx": num_ctx,
            "num_predict": 4096, # FIX: Prevent model from stopping early and cutting off JSON
        },
    }
    headers = {"Content-Type": "application/json"}
    
    # If the user has an Ollama API Key in their environment or .env file, pass it!
    import os
    api_key = os.getenv("OLLAMA_API_KEY")
    if not api_key:
        env_path = SCRIPT_DIR / ".." / ".." / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if line.startswith("OLLAMA_API_KEY="):
                        api_key = line.strip().split("=", 1)[1].strip('"\'')
                        break

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    resp = requests.post(OLLAMA_CHAT_ENDPOINT, json=payload, headers=headers, timeout=300)
    resp.raise_for_status()
    result = resp.json()
    return result["message"]["content"]


def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrapping if present."""
    text = text.strip()
    # Remove opening fence (```json or ```)
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    # Remove closing fence
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def parse_llm_response(raw: str) -> list[dict[str, Any]]:
    """Parse the LLM response into a list of row dicts.

    Strips markdown fences, handles common JSON issues, and validates
    that we received a list.
    """
    cleaned = strip_markdown_fences(raw)

    # Sometimes the model wraps the array in a top-level object
    # Try to find the array if it's inside an object
    if cleaned.startswith("{"):
        # Attempt to find the first array in the JSON
        try:
            obj = json.loads(cleaned)
            if isinstance(obj, dict):
                # Look for the first list value
                for v in obj.values():
                    if isinstance(v, list):
                        return v
        except json.JSONDecodeError:
            pass

    data = json.loads(cleaned)
    if not isinstance(data, list):
        raise ValueError(f"Expected JSON array, got {type(data).__name__}")
    return data


def generate_with_retries(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
) -> list[dict[str, Any]]:
    """Call LLM and parse response, retrying on JSON errors with exponential backoff."""
    backoff = INITIAL_BACKOFF_SECONDS

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw = call_ollama(system_prompt, user_prompt, model=model)
            rows = parse_llm_response(raw)
            return rows
        except (json.JSONDecodeError, ValueError) as exc:
            log.warning(
                "Attempt %d/%d — JSON parse error: %s", attempt, MAX_RETRIES, exc
            )
            if attempt < MAX_RETRIES:
                log.info("Retrying in %ds with exponential backoff …", backoff)
                time.sleep(backoff)
                backoff *= 2
            else:
                log.error(
                    "All %d attempts exhausted. Dumping raw response:\n%s",
                    MAX_RETRIES,
                    raw[:2000],
                )
                raise
        except requests.exceptions.RequestException as exc:
            log.warning(
                "Attempt %d/%d — HTTP error: %s", attempt, MAX_RETRIES, exc
            )
            if attempt < MAX_RETRIES:
                log.info("Retrying in %ds …", backoff)
                time.sleep(backoff)
                backoff *= 2
            else:
                raise


# ═══════════════════════════════════════════════════════════════════════════
# Spec loading
# ═══════════════════════════════════════════════════════════════════════════

def load_all_specs() -> list[dict[str, Any]]:
    """Load all *.intent.json files from the specs directory."""
    pattern = str(SPECS_DIR / "*.intent.json")
    paths = sorted(glob.glob(pattern))
    if not paths:
        log.error("No spec files found at %s", pattern)
        sys.exit(1)
    specs = []
    for p in paths:
        with open(p, "r", encoding="utf-8") as f:
            spec = json.load(f)
            specs.append(spec)
            log.info("Loaded spec: %-30s (%d actions)", spec["intent"],
                     len(spec.get("supported_actions", [])))
    return specs


# ═══════════════════════════════════════════════════════════════════════════
# Row validation & normalisation
# ═══════════════════════════════════════════════════════════════════════════

def normalise_row(row: dict[str, Any], intent: str, action: str) -> dict[str, Any]:
    """Ensure each generated row has the correct structure and labels."""
    return {
        "utterance": str(row.get("utterance", "")).strip(),
        "intent": intent,
        "taskType": action,
        "entities": [
            {
                "type": str(e.get("type", "")).upper().replace("_", ""),
                "value": str(e.get("value", "")),
            }
            for e in row.get("entities", [])
            if e.get("type") and e.get("value")
        ],
    }


# ═══════════════════════════════════════════════════════════════════════════
# Main generation loop
# ═══════════════════════════════════════════════════════════════════════════

def run_generation(args: argparse.Namespace) -> None:
    """Orchestrate the full generation pipeline."""

    # --- Pre-flight: check Ollama ---
    if not args.dry_run:
        log.info("Checking Ollama server at %s …", OLLAMA_BASE_URL)
        if not check_ollama_server():
            log.error(
                "🚫 Cannot connect to Ollama at %s.\n"
                "   Please make sure Ollama is running:\n"
                "       ollama serve\n"
                "   Then try again.",
                OLLAMA_BASE_URL,
            )
            sys.exit(1)
        log.info("✅ Ollama server is reachable.")

    # --- Load specs ---
    all_specs = load_all_specs()

    # Filter to single intent if requested
    if args.intent:
        target = args.intent.upper()
        all_specs = [s for s in all_specs if s["intent"] == target]
        if not all_specs:
            log.error("Intent '%s' not found in spec files.", args.intent)
            sys.exit(1)

    # Separate UNKNOWN from financial intents
    financial_specs = [s for s in all_specs if s["intent"] != "UNKNOWN"]
    unknown_specs = [s for s in all_specs if s["intent"] == "UNKNOWN"]

    # --- Prepare output ---
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    system_prompt = build_system_prompt()

    summary: dict[str, int] = {}
    total_rows = 0
    start_time = time.time()

    # Check existing data to resume if possible
    existing_counts: dict[str, int] = {}
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if not line.strip(): continue
                try:
                    row = json.loads(line)
                    k = f"{row.get('intent')}_{row.get('taskType')}"
                    existing_counts[k] = existing_counts.get(k, 0) + 1
                    total_rows += 1
                except Exception:
                    pass
        if total_rows > 0:
            log.info("Found existing dataset with %d rows. Resuming...", total_rows)

    with open(OUTPUT_FILE, "a", encoding="utf-8") as out_f:

        # -----------------------------------------------------------
        # Generate for each financial intent × action
        # -----------------------------------------------------------
        for spec in financial_specs:
            intent = spec["intent"]
            actions = spec.get("supported_actions", [])
            intent_count = 0

            for action in actions:
                k = f"{intent}_{action}"
                already_done = existing_counts.get(k, 0)
                remaining = max(0, args.count - already_done)
                
                log.info("━" * 60)
                if remaining == 0:
                    log.info("Skipping    intent=%-25s  action=%-10s (Already generated %d)", intent, action, already_done)
                    intent_count += already_done
                    continue

                log.info(
                    "Generating  intent=%-25s  action=%-10s  count=%d (Target: %d, Done: %d)",
                    intent, action, remaining, args.count, already_done
                )
                while remaining > 0:
                    batch_size = min(remaining, 5)
                    log.info("Requesting batch of %d (remaining: %d)", batch_size, remaining)
                    user_prompt = build_user_prompt(spec, action, batch_size)

                    if args.dry_run:
                        log.info("[DRY-RUN] System prompt length: %d chars", len(system_prompt))
                        log.info("[DRY-RUN] User prompt:\n%s", user_prompt[:1500])
                        log.info("[DRY-RUN] Skipping LLM call.")
                        remaining -= batch_size
                        continue

                    try:
                        rows = generate_with_retries(system_prompt, user_prompt, model=args.model)
                    except Exception as exc:
                        log.error(
                            "Failed to generate for %s/%s: %s — skipping remaining.", intent, action, exc
                        )
                        break

                    # Write rows
                    written = 0
                    for row in rows:
                        normalised = normalise_row(row, intent, action)
                        if not normalised["utterance"]:
                            continue
                        out_f.write(json.dumps(normalised, ensure_ascii=False) + "\n")
                        written += 1

                    intent_count += written
                    total_rows += written
                    log.info(
                        "✅ Written %d rows for %s / %s (total so far: %d)",
                        written, intent, action, total_rows,
                    )
                    
                    # Decrement by batch_size, not written, to ensure we don't infinite loop if LLM under-generates
                    remaining -= batch_size

            summary[intent] = intent_count

        # -----------------------------------------------------------
        # Generate UNKNOWN / OOD
        # -----------------------------------------------------------
        if unknown_specs or (not args.intent):
            # Generate UNKNOWN even if it has no spec, unless --intent is
            # set to something other than UNKNOWN
            if args.intent and args.intent.upper() != "UNKNOWN":
                pass  # user asked for a specific financial intent, skip UNKNOWN
            else:
                k = "UNKNOWN_NONE"
                already_done = existing_counts.get(k, 0)
                remaining = max(0, args.count - already_done)
                unknown_count = already_done
                
                log.info("━" * 60)
                if remaining == 0:
                    log.info("Skipping    intent=UNKNOWN  action=NONE (Already generated %d)", already_done)
                else:
                    log.info(
                        "Generating  intent=UNKNOWN  action=NONE  count=%d (Target: %d, Done: %d)",
                        remaining, args.count, already_done
                    )
                while remaining > 0:
                    batch_size = min(remaining, 5)
                    log.info("Requesting UNKNOWN batch of %d (remaining: %d)", batch_size, remaining)
                    unknown_user_prompt = build_unknown_prompt(batch_size)

                    if args.dry_run:
                        log.info("[DRY-RUN] UNKNOWN prompt:\n%s", unknown_user_prompt[:1500])
                        log.info("[DRY-RUN] Skipping LLM call.")
                        remaining -= batch_size
                        continue

                    try:
                        # Use a minimal system prompt for UNKNOWN
                        unknown_system = (
                            "You are a synthetic data generator. "
                            "Produce diverse out-of-domain utterances as instructed. "
                            "Output ONLY a JSON array."
                        )
                        rows = generate_with_retries(
                            unknown_system, unknown_user_prompt, model=args.model
                        )
                        written = 0
                        for row in rows:
                            normalised = normalise_row(row, "UNKNOWN", "NONE")
                            if not normalised["utterance"]:
                                continue
                            out_f.write(
                                json.dumps(normalised, ensure_ascii=False) + "\n"
                            )
                            written += 1
                        total_rows += written
                        unknown_count += written
                        log.info("✅ Written %d UNKNOWN rows (total so far: %d).", written, unknown_count)
                    except Exception as exc:
                        log.error("Failed to generate UNKNOWN rows: %s — skipping remaining.", exc)
                        break
                    
                    remaining -= batch_size
                
                summary["UNKNOWN"] = unknown_count

    elapsed = time.time() - start_time

    # -----------------------------------------------------------
    # Summary table
    # -----------------------------------------------------------
    if not args.dry_run:
        log.info("")
        log.info("═" * 60)
        log.info("  GENERATION SUMMARY")
        log.info("═" * 60)
        log.info("  %-30s  %s", "Intent", "Rows")
        log.info("  %-30s  %s", "─" * 30, "─" * 6)
        for intent_name, count in sorted(summary.items()):
            log.info("  %-30s  %d", intent_name, count)
        log.info("  %-30s  %s", "─" * 30, "─" * 6)
        log.info("  %-30s  %d", "TOTAL", total_rows)
        log.info("═" * 60)
        log.info("  Output file : %s", OUTPUT_FILE)
        log.info("  Time elapsed: %.1fs", elapsed)
        log.info("  Model       : %s", args.model)
        log.info("═" * 60)
    else:
        log.info("")
        log.info("[DRY-RUN] Complete. No LLM calls were made.")
        log.info("[DRY-RUN] %d spec(s) loaded, %d intent-action pairs would be generated.",
                 len(all_specs),
                 sum(len(s.get("supported_actions", [])) for s in financial_specs)
                 + (1 if not args.intent or args.intent.upper() == "UNKNOWN" else 0))


# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate WealthPilot training data using Ollama.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  python ollama_generate.py                          # all intents, 30/action
  python ollama_generate.py --intent ADD_EXPENSE     # single intent
  python ollama_generate.py --count 50               # 50 utterances per action
  python ollama_generate.py --dry-run                # preview prompts only
  python ollama_generate.py --model llama3:8b        # override model
""",
    )
    parser.add_argument(
        "--intent",
        type=str,
        default=None,
        help="Generate for a single intent (e.g. ADD_EXPENSE). Default: all.",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=DEFAULT_COUNT,
        help=f"Number of utterances per action. Default: {DEFAULT_COUNT}.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show prompts without calling the LLM.",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help=f"Ollama model to use. Default: {DEFAULT_MODEL}.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    log.info("WealthPilot Ollama Dataset Generator")
    log.info("Started at %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    log.info("Model: %s | Count: %d | Dry-run: %s | Intent filter: %s",
             args.model, args.count, args.dry_run, args.intent or "ALL")
    run_generation(args)


if __name__ == "__main__":
    main()
