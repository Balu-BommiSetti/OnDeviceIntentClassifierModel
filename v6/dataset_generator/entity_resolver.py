"""
Entity Resolver – Reference Implementation for WealthPilot
===========================================================

Pure-Python module that demonstrates how raw entity strings produced by the
on-device NLP model should be resolved into structured values that the
deterministic WealthPilot engines can consume.

This is a *reference implementation* meant to be ported to TypeScript for
the production on-device runtime.

Resolvers
---------
- resolve_amount   → float value + currency + confidence
- resolve_date     → ABSOLUTE / RELATIVE date descriptor
- resolve_period   → RELATIVE_RANGE / ABSOLUTE_RANGE / FISCAL_QUARTER / COMPARISON
- resolve_frequency→ interval + count
- resolve_entities → routes a list of entity dicts to the right resolver
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Helper look-up tables
# ---------------------------------------------------------------------------

# Multiplier suffixes understood by resolve_amount
_SUFFIX_MULTIPLIERS: dict[str, float] = {
    "k": 1_000,
    "m": 1_000_000,
    "b": 1_000_000_000,
    "lakh": 100_000,
    "lakhs": 100_000,
    "lac": 100_000,
    "lacs": 100_000,
    "crore": 10_000_000,
    "crores": 10_000_000,
    "cr": 10_000_000,
    "grand": 1_000,
    "thousand": 1_000,
    "million": 1_000_000,
    "billion": 1_000_000_000,
}

# Word → number mapping (covers common spoken amounts)
_WORD_NUMBERS: dict[str, float] = {
    "zero": 0, "a": 1, "an": 1, "one": 1, "two": 2, "three": 3,
    "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1_000,
    "million": 1_000_000, "billion": 1_000_000_000,
    "lakh": 100_000, "lakhs": 100_000, "lac": 100_000, "lacs": 100_000,
    "crore": 10_000_000, "crores": 10_000_000, "cr": 10_000_000,
    "grand": 1_000,
}

# Vague quantifier phrases that imply low/medium confidence
_VAGUE_QUANTIFIERS: dict[str, tuple[float, str]] = {
    "a couple": (2, "low"),
    "a few": (3, "low"),
    "several": (5, "low"),
    "some": (3, "low"),
    "roughly": (1, "medium"),  # multiplier applied to following number
    "around": (1, "medium"),
    "about": (1, "medium"),
    "approximately": (1, "medium"),
    "nearly": (1, "medium"),
    "almost": (1, "medium"),
}

# Month name → number
_MONTHS: dict[str, int] = {
    "january": 1, "jan": 1, "february": 2, "feb": 2,
    "march": 3, "mar": 3, "april": 4, "apr": 4,
    "may": 5, "june": 6, "jun": 6,
    "july": 7, "jul": 7, "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10, "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}

# Day-of-week name → ISO weekday number (Monday=0 … Sunday=6)
_DAYS_OF_WEEK: dict[str, int] = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}

# Time-unit aliases normalised to a canonical form
_TIME_UNITS: dict[str, str] = {
    "day": "day", "days": "day",
    "week": "week", "weeks": "week",
    "month": "month", "months": "month",
    "year": "year", "years": "year",
    "quarter": "quarter", "quarters": "quarter",
}


# ===================================================================
# 1. resolve_amount
# ===================================================================

def resolve_amount(raw: str) -> dict[str, Any]:
    """Resolve a raw amount string into a structured value.

    Returns
    -------
    dict with keys:
        value      – float
        currency   – str | None
        confidence – "high" | "medium" | "low"
        original   – str (the raw input)
    """
    original = raw
    text = raw.strip().lower()

    # ----- currency detection (simple prefix/suffix) -----
    currency: str | None = None
    currency_map = {
        "₹": "INR", "rs": "INR", "rs.": "INR", "inr": "INR",
        "$": "USD", "usd": "USD",
        "€": "EUR", "eur": "EUR",
        "£": "GBP", "gbp": "GBP",
    }
    for sym, code in currency_map.items():
        if text.startswith(sym):
            currency = code
            text = text[len(sym):].strip()
            break
        if text.endswith(sym):
            currency = code
            text = text[: -len(sym)].strip()
            break

    confidence = "high"

    # ----- vague quantifier prefix handling -----
    # e.g. "a couple hundred", "roughly 500", "a few thousand"
    vague_multiplier: float | None = None
    for phrase, (mult, conf) in sorted(
        _VAGUE_QUANTIFIERS.items(), key=lambda x: -len(x[0])
    ):
        if text.startswith(phrase):
            rest = text[len(phrase):].strip()
            if rest:
                vague_multiplier = mult
                confidence = conf
                text = rest
                break

    # ----- try pure numeric (with commas) -----
    # Remove commas for both Western (50,000) and Indian (1,00,000)
    stripped = text.replace(",", "")
    # Match number possibly followed by a suffix like k/M/lakhs/grand
    m = re.match(
        r"^([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z]*)\s*$", stripped
    )
    if m:
        num = float(m.group(1))
        suffix = m.group(2).lower().rstrip("s").rstrip(".")  # normalise
        # Re-check with original suffix for plural forms
        suffix_raw = m.group(2).lower()
        if suffix_raw in _SUFFIX_MULTIPLIERS:
            num *= _SUFFIX_MULTIPLIERS[suffix_raw]
        elif suffix in _SUFFIX_MULTIPLIERS:
            num *= _SUFFIX_MULTIPLIERS[suffix]
        if vague_multiplier is not None:
            num *= vague_multiplier
        return {
            "value": num,
            "currency": currency,
            "confidence": confidence,
            "original": original,
        }

    # ----- word-based amounts -----
    value = _parse_word_number(text)
    if value is not None:
        if vague_multiplier is not None:
            value *= vague_multiplier
        return {
            "value": value,
            "currency": currency,
            "confidence": confidence,
            "original": original,
        }

    # Fallback – return 0 with low confidence
    return {
        "value": 0,
        "currency": currency,
        "confidence": "low",
        "original": original,
    }


def _parse_word_number(text: str) -> float | None:
    """Convert a word-based number phrase to a float.

    Handles patterns like:
        "fifty"               → 50
        "two hundred"         → 200
        "five hundred"        → 500
        "two grand"           → 2000
        "a thousand"          → 1000
        "a couple hundred"    → 200   (when called after vague prefix strip)
    """
    tokens = text.split()
    if not tokens:
        return None

    # Check every token is a recognised word-number
    nums: list[float] = []
    for tok in tokens:
        tok_clean = tok.strip(".,;!?")
        if tok_clean in _WORD_NUMBERS:
            nums.append(_WORD_NUMBERS[tok_clean])
        else:
            return None  # unrecognised token – bail out

    if not nums:
        return None

    # Combine: use a simple accumulator that treats "hundred", "thousand",
    # "million", "billion", "lakh", "crore", "grand" as multipliers for the
    # preceding accumulated value.
    _BIG = {100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 1_000_000_000}
    result = 0.0
    current = 0.0
    for n in nums:
        if n in _BIG:
            if current == 0:
                current = 1  # "a hundred" means 1 × 100
            current *= n
            # If this is a "section boundary" (thousand+), flush to result
            if n >= 1_000:
                result += current
                current = 0.0
        else:
            current += n

    result += current
    return result


# ===================================================================
# 2. resolve_date
# ===================================================================

def resolve_date(raw: str) -> dict[str, Any]:
    """Resolve a raw date string into a structured date descriptor.

    Returns
    -------
    dict with keys:
        type       – "ABSOLUTE" | "RELATIVE"
        offset     – int | None   (for RELATIVE; negative = past)
        unit       – str | None   ("day", "week", "month", "year")
        day        – int | None
        month      – int | None
        year       – int | None
        dayOfWeek  – int | None   (Monday=0 … Sunday=6)
        modifier   – str | None   ("last", "next", "this", …)
        confidence – "high" | "medium" | "low"
        original   – str
    """
    original = raw
    text = raw.strip().lower()

    base: dict[str, Any] = {
        "type": "RELATIVE",
        "offset": None,
        "unit": None,
        "day": None,
        "month": None,
        "year": None,
        "dayOfWeek": None,
        "modifier": None,
        "confidence": "high",
        "original": original,
    }

    # --- Named-day shortcuts ---
    if text == "today":
        return {**base, "offset": 0, "unit": "day"}
    if text == "yesterday":
        return {**base, "offset": -1, "unit": "day"}
    if text == "tomorrow":
        return {**base, "offset": 1, "unit": "day"}
    if text in ("day before yesterday", "day before"):
        return {**base, "offset": -2, "unit": "day"}
    if text in ("day after tomorrow",):
        return {**base, "offset": 2, "unit": "day"}

    # --- Time-of-day phrases ---
    if text in ("this morning", "this afternoon", "this evening", "tonight"):
        return {**base, "offset": 0, "unit": "day"}
    if text in ("last night",):
        # Depending on the time of day, "last night" may mean yesterday
        # or earlier tonight.  For simplicity, treat as yesterday.
        return {**base, "offset": -1, "unit": "day"}

    # --- "N <unit> ago" ---
    m = re.match(r"(\d+)\s+(day|days|week|weeks|month|months|year|years)\s+ago", text)
    if m:
        n = int(m.group(1))
        unit = _TIME_UNITS.get(m.group(2), m.group(2))
        return {**base, "offset": -n, "unit": unit}

    # --- "a <unit> ago" ---
    m = re.match(r"an?\s+(day|week|month|year)\s+ago", text)
    if m:
        unit = _TIME_UNITS.get(m.group(1), m.group(1))
        return {**base, "offset": -1, "unit": unit}

    # --- Day-of-week: "on Monday", "last Tuesday", "next Friday" ---
    for day_name, dow in _DAYS_OF_WEEK.items():
        # "on Monday", "Monday"
        if text in (f"on {day_name}", day_name):
            return {**base, "dayOfWeek": dow}
        # "last Monday", "next Monday", "this Monday"
        m2 = re.match(rf"(last|next|this)\s+{day_name}", text)
        if m2:
            modifier = m2.group(1)
            return {**base, "dayOfWeek": dow, "modifier": modifier}

    # --- Absolute: "on 15th March", "March 15", "15 March 2024" ---
    # Pattern: day month [year]
    m = re.match(
        r"(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)(?:\s+(\d{4}))?",
        text,
    )
    if m and m.group(2) in _MONTHS:
        day = int(m.group(1))
        month = _MONTHS[m.group(2)]
        year = int(m.group(3)) if m.group(3) else None
        return {
            **base,
            "type": "ABSOLUTE",
            "day": day,
            "month": month,
            "year": year,
        }

    # Pattern: month day [year]   (e.g. "March 15")
    m = re.match(
        r"(?:on\s+)?([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?",
        text,
    )
    if m and m.group(1) in _MONTHS:
        month = _MONTHS[m.group(1)]
        day = int(m.group(2))
        year = int(m.group(3)) if m.group(3) else None
        return {
            **base,
            "type": "ABSOLUTE",
            "day": day,
            "month": month,
            "year": year,
        }

    # --- ISO-style: "2024-03-15" ---
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", text)
    if m:
        return {
            **base,
            "type": "ABSOLUTE",
            "year": int(m.group(1)),
            "month": int(m.group(2)),
            "day": int(m.group(3)),
        }

    # --- Vague relative phrases ---
    if text in ("recently", "the other day"):
        return {**base, "offset": -2, "unit": "day", "confidence": "low"}
    if text in ("a while ago", "some time ago", "long ago"):
        return {**base, "offset": -30, "unit": "day", "confidence": "low"}
    if text in ("a few days ago",):
        return {**base, "offset": -3, "unit": "day", "confidence": "low"}

    # Fallback
    return {**base, "confidence": "low"}


# ===================================================================
# 3. resolve_period
# ===================================================================

def resolve_period(raw: str) -> dict[str, Any]:
    """Resolve a raw period/range string into a structured period descriptor.

    Returns
    -------
    dict with keys:
        type        – "RELATIVE_RANGE" | "ABSOLUTE_RANGE" | "ABSOLUTE_RANGE_OPEN"
                      | "FISCAL_QUARTER" | "COMPARISON"
        startOffset – int | None
        endOffset   – int | None
        unit        – str | None
        quarter     – int | None
        month       – int | None
        startMonth  – int | None
        current     – dict | None   (for COMPARISON)
        previous    – dict | None   (for COMPARISON)
        original    – str
    """
    original = raw
    text = raw.strip().lower()

    base: dict[str, Any] = {
        "type": "RELATIVE_RANGE",
        "startOffset": None,
        "endOffset": None,
        "unit": None,
        "quarter": None,
        "month": None,
        "startMonth": None,
        "current": None,
        "previous": None,
        "original": original,
    }

    # --- "this <unit>" ---
    m = re.match(r"this\s+(week|month|year|quarter)", text)
    if m:
        unit = _TIME_UNITS.get(m.group(1), m.group(1))
        return {**base, "startOffset": 0, "endOffset": 0, "unit": unit}

    # --- "last <unit>" (no number) ---
    m = re.match(r"last\s+(week|month|year|quarter)$", text)
    if m:
        unit = _TIME_UNITS.get(m.group(1), m.group(1))
        return {**base, "startOffset": -1, "endOffset": -1, "unit": unit}

    # --- "last N <units>" ---
    m = re.match(r"last\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)", text)
    if m:
        n = int(m.group(1))
        unit = _TIME_UNITS.get(m.group(2), m.group(2))
        return {**base, "startOffset": -n, "endOffset": -1, "unit": unit}

    # --- "past N <units>" ---
    m = re.match(r"past\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)", text)
    if m:
        n = int(m.group(1))
        unit = _TIME_UNITS.get(m.group(2), m.group(2))
        return {**base, "startOffset": -n, "endOffset": -1, "unit": unit}

    # --- "since <Month>" ---
    m = re.match(r"since\s+([a-z]+)", text)
    if m and m.group(1) in _MONTHS:
        month_num = _MONTHS[m.group(1)]
        return {
            **base,
            "type": "ABSOLUTE_RANGE_OPEN",
            "startMonth": month_num,
        }

    # --- Fiscal quarter: "Q1", "Q2", "q3", "Q4" ---
    m = re.match(r"q([1-4])$", text)
    if m:
        return {**base, "type": "FISCAL_QUARTER", "quarter": int(m.group(1))}

    # --- "last quarter" ---
    if text == "last quarter":
        return {
            **base,
            "type": "FISCAL_QUARTER",
            "quarter": None,  # resolved at runtime
            "startOffset": -1,
            "endOffset": -1,
            "unit": "quarter",
        }

    # --- "in <Month>" / "for <Month>" ---
    m = re.match(r"(?:in|for|during)\s+([a-z]+)", text)
    if m and m.group(1) in _MONTHS:
        month_num = _MONTHS[m.group(1)]
        return {**base, "type": "ABSOLUTE_RANGE", "month": month_num}

    # --- Comparison: "this month vs last" / "this year vs last year" ---
    m = re.match(
        r"this\s+(week|month|year)\s+vs\.?\s+last(?:\s+\1)?", text
    )
    if m:
        unit = _TIME_UNITS.get(m.group(1), m.group(1))
        return {
            **base,
            "type": "COMPARISON",
            "current": {"startOffset": 0, "endOffset": 0, "unit": unit},
            "previous": {"startOffset": -1, "endOffset": -1, "unit": unit},
        }

    # --- "year to date" / "ytd" ---
    if text in ("year to date", "ytd"):
        return {
            **base,
            "type": "ABSOLUTE_RANGE_OPEN",
            "startOffset": 0,
            "endOffset": 0,
            "unit": "year",
        }

    # Fallback
    return base


# ===================================================================
# 4. resolve_frequency
# ===================================================================

_FREQUENCY_MAP: dict[str, tuple[str, int]] = {
    "daily": ("day", 1),
    "every day": ("day", 1),
    "weekly": ("week", 1),
    "every week": ("week", 1),
    "bi-weekly": ("week", 2),
    "biweekly": ("week", 2),
    "fortnightly": ("week", 2),
    "monthly": ("month", 1),
    "every month": ("month", 1),
    "bi-monthly": ("month", 2),
    "bimonthly": ("month", 2),
    "quarterly": ("month", 3),
    "every quarter": ("month", 3),
    "semi-annually": ("month", 6),
    "semiannually": ("month", 6),
    "half-yearly": ("month", 6),
    "annually": ("year", 1),
    "yearly": ("year", 1),
    "every year": ("year", 1),
}


def resolve_frequency(raw: str) -> dict[str, Any]:
    """Resolve a raw frequency string into an interval descriptor.

    Returns
    -------
    dict with keys:
        interval – str   ("day", "week", "month", "year")
        count    – int
        original – str
    """
    original = raw
    text = raw.strip().lower()

    # Direct look-up
    if text in _FREQUENCY_MAP:
        interval, count = _FREQUENCY_MAP[text]
        return {"interval": interval, "count": count, "original": original}

    # "every N <units>"
    m = re.match(
        r"every\s+(\d+)\s+(day|days|week|weeks|month|months|year|years)", text
    )
    if m:
        count = int(m.group(1))
        unit = _TIME_UNITS.get(m.group(2), m.group(2))
        return {"interval": unit, "count": count, "original": original}

    # "twice a <unit>"
    m = re.match(r"twice\s+a\s+(week|month|year)", text)
    if m:
        # "twice a month" doesn't map neatly to interval×count; approximate
        # as half the unit's count.
        unit = _TIME_UNITS.get(m.group(1), m.group(1))
        return {"interval": unit, "count": 0.5, "original": original}

    # Fallback
    return {"interval": None, "count": 0, "original": original}


# ===================================================================
# 5. resolve_entities  (router)
# ===================================================================

# Entity types routed to each resolver
_AMOUNT_TYPES = {"AMOUNT", "TARGETAMOUNT", "EXTRAPAYMENT"}
_DATE_TYPES = {"DATE", "TARGETDATE"}
_PERIOD_TYPES = {"PERIOD"}
_FREQUENCY_TYPES = {"FREQUENCY"}


def resolve_entities(entities: list[dict]) -> list[dict]:
    """Route each entity dict to the appropriate resolver.

    Each entity dict is expected to have at least:
        - "type": str   (the entity type label)
        - "value": str  (the raw extracted text)

    Returns a list of entity dicts augmented with a "resolved" key.
    """
    results: list[dict] = []
    for ent in entities:
        etype = ent.get("type", "").upper()
        raw = ent.get("value", "")

        if etype in _AMOUNT_TYPES:
            resolved = resolve_amount(raw)
        elif etype in _DATE_TYPES:
            resolved = resolve_date(raw)
        elif etype in _PERIOD_TYPES:
            resolved = resolve_period(raw)
        elif etype in _FREQUENCY_TYPES:
            resolved = resolve_frequency(raw)
        else:
            resolved = {"value": raw, "resolved": raw}

        results.append({**ent, "resolved": resolved})

    return results


# ===================================================================
# CLI Test Harness
# ===================================================================

if __name__ == "__main__":
    import json
    import sys

    # Each tuple: (resolver_name, raw_input, expected_value, field_to_check)
    # field_to_check defaults to "value" for amounts, "offset" for dates,
    # "startOffset" for periods, "interval" for frequencies — unless overridden.
    test_cases: list[tuple[str, str, Any] | tuple[str, str, Any, str]] = [
        # ── Amounts ────────────────────────────────────────────────
        ("amount", "500", 500),
        ("amount", "45.50", 45.50),
        ("amount", "10k", 10_000),
        ("amount", "2.5M", 2_500_000),
        ("amount", "1.5k", 1_500),
        ("amount", "1.5 lakhs", 150_000),
        ("amount", "2 crores", 20_000_000),
        ("amount", "1 lakh", 100_000),
        ("amount", "50 lacs", 5_000_000),
        ("amount", "1 cr", 10_000_000),
        ("amount", "fifty", 50),
        ("amount", "two hundred", 200),
        ("amount", "two grand", 2_000),
        ("amount", "a thousand", 1_000),
        ("amount", "five hundred", 500),
        ("amount", "a couple hundred", 200),
        ("amount", "a few thousand", 3_000),
        ("amount", "roughly 500", 500),
        ("amount", "50,000", 50_000),
        ("amount", "1,00,000", 100_000),

        # ── Dates ──────────────────────────────────────────────────
        ("date", "today", 0, "offset"),
        ("date", "yesterday", -1, "offset"),
        ("date", "day before yesterday", -2, "offset"),
        ("date", "3 days ago", -3, "offset"),
        ("date", "last night", -1, "offset"),
        ("date", "this morning", 0, "offset"),
        ("date", "on Monday", 0, "dayOfWeek"),
        ("date", "last Tuesday", 1, "dayOfWeek"),
        ("date", "on 15th March", 15, "day"),
        ("date", "March 15", 15, "day"),
        ("date", "recently", "low", "confidence"),

        # ── Periods ───────────────────────────────────────────────
        ("period", "last week", -1, "startOffset"),
        ("period", "last 2 months", -2, "startOffset"),
        ("period", "this year", 0, "startOffset"),
        ("period", "past 6 months", -6, "startOffset"),
        ("period", "since January", 1, "startMonth"),
        ("period", "Q1", 1, "quarter"),
        ("period", "in July", 7, "month"),
        ("period", "for June", 6, "month"),
        ("period", "this month vs last", "COMPARISON", "type"),

        # ── Frequencies ───────────────────────────────────────────
        ("frequency", "monthly", "month", "interval"),
        ("frequency", "every 2 weeks", "week", "interval"),
        ("frequency", "bi-weekly", "week", "interval"),
        ("frequency", "quarterly", "month", "interval"),
        ("frequency", "annually", "year", "interval"),
        ("frequency", "daily", "day", "interval"),
    ]

    passed = 0
    failed = 0
    total = len(test_cases)

    print("=" * 72)
    print("  WealthPilot Entity Resolver – Test Suite")
    print("=" * 72)

    for i, tc in enumerate(test_cases, start=1):
        resolver_name = tc[0]
        raw_input = tc[1]
        expected = tc[2]
        field = tc[3] if len(tc) > 3 else "value"  # type: ignore[misc]

        # Dispatch
        if resolver_name == "amount":
            result = resolve_amount(raw_input)
        elif resolver_name == "date":
            result = resolve_date(raw_input)
        elif resolver_name == "period":
            result = resolve_period(raw_input)
        elif resolver_name == "frequency":
            result = resolve_frequency(raw_input)
        else:
            result = {}

        actual = result.get(field)

        ok = actual == expected
        status = "PASS ✅" if ok else "FAIL ❌"
        if ok:
            passed += 1
        else:
            failed += 1

        print(f"\n[{i:02d}] {status}  {resolver_name}({raw_input!r})")
        print(f"     field={field!r}  expected={expected!r}  actual={actual!r}")
        if not ok:
            print(f"     full result → {json.dumps(result, default=str)}")

    print("\n" + "=" * 72)
    print(f"  Results: {passed}/{total} passed, {failed} failed")
    print("=" * 72)

    # ── Also exercise resolve_entities router ──
    print("\n--- resolve_entities() router demo ---\n")
    sample_entities = [
        {"type": "AMOUNT", "value": "1.5 lakhs"},
        {"type": "TARGETDATE", "value": "yesterday"},
        {"type": "PERIOD", "value": "last 2 months"},
        {"type": "FREQUENCY", "value": "monthly"},
        {"type": "CATEGORY", "value": "groceries"},  # pass-through
    ]
    resolved = resolve_entities(sample_entities)
    for ent in resolved:
        print(json.dumps(ent, indent=2, default=str))
        print()

    sys.exit(1 if failed > 0 else 0)
