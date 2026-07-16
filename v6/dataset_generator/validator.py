#!/usr/bin/env python3
"""
Validator: Pre-Training Dataset Quality Gate

Validates the final dataset.jsonl to ensure it meets all requirements
before being fed into train.py. Runs comprehensive checks and produces
a detailed validation report.

Author: NLP Pipeline Team
"""

import argparse
import json
import logging
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Set, Tuple

# ─── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── Valid Values ────────────────────────────────────────────────────────────────

VALID_INTENTS: Set[str] = {
    "ADD_ASSET",
    "ADD_EXPENSE",
    "ADD_INCOME",
    "ADD_LIABILITY",
    "AFFORDABILITY_CHECK",
    "BUDGET_PLANNING",
    "CASHFLOW_WARNING",
    "DEBT_FREEDOM_ANALYSIS",
    "GOAL_PLANNING",
    "INCOME_DECLARATION",
    "LOAN_ANALYSIS",
    "NET_WORTH_CHECK",
    "REFUND",
    "SAVINGS_ADVICE",
    "SPENDING_ANALYSIS",
    "SIP_VS_PREPAY",
    "FAMILY_TRANSFER",
    "UNKNOWN",
}

VALID_ENTITY_TYPES: Set[str] = {
    "AMOUNT",
    "ASSETTYPE",
    "CATEGORY",
    "CURRENCY",
    "DATE",
    "DATE1",
    "DATE2",
    "EXTRAPAYMENT",
    "FREQUENCY",
    "GOALNAME",
    "INTERESTRATE",
    "LENDER",
    "LIABILITYTYPE",
    "MERCHANT",
    "MONTHLYCONTRIBUTION",
    "NEWRATE",
    "PAYMENTMETHOD",
    "PERIOD",
    "SPLITWITH",
    "TARGETAMOUNT",
    "TARGETDATE",
    "TENUREMONTHS",
}

# IOB tag pattern: must be "O", or "B-ENTITYTYPE" / "I-ENTITYTYPE"
_IOB_PATTERN = re.compile(r'^(O|[BI]-[A-Z][A-Z0-9]*)$')

# Minimum samples per intent before triggering a balance warning
INTENT_BALANCE_THRESHOLD = 50

# Minimum percentage of samples that should have 2+ entities
MULTI_ENTITY_MIN_PERCENT = 10.0


# ─── Check Functions ────────────────────────────────────────────────────────────

class ValidationResult:
    """Stores the result of a single validation check."""

    def __init__(self, name: str):
        self.name = name
        self.passed = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []
        self.invalid_row_indices: List[int] = []

    def fail(self, message: str, row_idx: Optional[int] = None):
        self.passed = False
        self.errors.append(message)
        if row_idx is not None:
            self.invalid_row_indices.append(row_idx)

    def warn(self, message: str):
        self.warnings.append(message)

    def add_info(self, message: str):
        self.info.append(message)

    @property
    def status(self) -> str:
        if not self.passed:
            return "❌ FAIL"
        if self.warnings:
            return "⚠️  WARN"
        return "✅ PASS"


def check_required_fields(rows: List[Dict]) -> ValidationResult:
    """Check 1: Every row has utterance, intent, taskType, tokens, tags."""
    result = ValidationResult("Required Fields")
    required = {"utterance", "intent", "taskType", "tokens", "tags"}

    for idx, row in enumerate(rows):
        missing = required - set(row.keys())
        if missing:
            result.fail(
                f"Row {idx}: Missing required fields: {sorted(missing)}",
                row_idx=idx,
            )
        else:
            # Also check types
            if not isinstance(row["tokens"], list):
                result.fail(f"Row {idx}: 'tokens' is not a list", row_idx=idx)
            if not isinstance(row["tags"], list):
                result.fail(f"Row {idx}: 'tags' is not a list", row_idx=idx)

    if result.passed:
        result.add_info(f"All {len(rows)} rows have required fields.")
    else:
        result.add_info(f"{len(result.errors)} rows with missing/invalid fields.")

    return result


def check_token_tag_alignment(rows: List[Dict]) -> ValidationResult:
    """Check 2: tokens and tags have the same length."""
    result = ValidationResult("Token-Tag Length Alignment")
    mismatches = 0

    for idx, row in enumerate(rows):
        tokens = row.get("tokens", [])
        tags = row.get("tags", [])
        if isinstance(tokens, list) and isinstance(tags, list):
            if len(tokens) != len(tags):
                mismatches += 1
                result.fail(
                    f"Row {idx}: tokens({len(tokens)}) != tags({len(tags)}) "
                    f"— utterance: '{row.get('utterance', '?')[:60]}...'",
                    row_idx=idx,
                )

    if result.passed:
        result.add_info(f"All {len(rows)} rows have aligned tokens and tags.")
    else:
        result.add_info(f"{mismatches} rows with misaligned token/tag lengths.")

    return result


def check_valid_intents(rows: List[Dict]) -> ValidationResult:
    """Check 3: All intents are from the known set."""
    result = ValidationResult("Valid Intents")
    unknown_intents = Counter()

    for idx, row in enumerate(rows):
        intent = row.get("intent", "")
        if intent not in VALID_INTENTS:
            unknown_intents[intent] += 1
            result.fail(
                f"Row {idx}: Unknown intent '{intent}'",
                row_idx=idx,
            )

    if result.passed:
        result.add_info("All intents are from the known set.")
    else:
        result.add_info(
            f"Unknown intents found: {dict(unknown_intents)}"
        )

    return result


def check_valid_iob_tags(rows: List[Dict]) -> ValidationResult:
    """Check 4: All tags follow valid IOB format (O, B-TYPE, I-TYPE)."""
    result = ValidationResult("Valid IOB Tags")
    invalid_tags = Counter()

    for idx, row in enumerate(rows):
        tags = row.get("tags", [])
        if not isinstance(tags, list):
            continue
        for tag_idx, tag in enumerate(tags):
            if not _IOB_PATTERN.match(tag):
                invalid_tags[tag] += 1
                result.fail(
                    f"Row {idx}, position {tag_idx}: Invalid IOB tag '{tag}'",
                    row_idx=idx,
                )

    # Also check IOB sequence validity (I- must follow B- or I- of same type)
    iob_seq_errors = 0
    for idx, row in enumerate(rows):
        tags = row.get("tags", [])
        if not isinstance(tags, list):
            continue
        for tag_idx, tag in enumerate(tags):
            if tag.startswith("I-"):
                entity_type = tag[2:]
                if tag_idx == 0:
                    iob_seq_errors += 1
                    result.warn(
                        f"Row {idx}, position {tag_idx}: I-{entity_type} "
                        f"without preceding B-{entity_type}"
                    )
                else:
                    prev_tag = tags[tag_idx - 1]
                    if prev_tag != f"B-{entity_type}" and prev_tag != f"I-{entity_type}":
                        iob_seq_errors += 1
                        result.warn(
                            f"Row {idx}, position {tag_idx}: I-{entity_type} "
                            f"follows '{prev_tag}' (expected B/I-{entity_type})"
                        )

    if result.passed and not result.warnings:
        result.add_info("All tags follow valid IOB format and sequencing.")
    else:
        if invalid_tags:
            result.add_info(f"Invalid tag formats: {dict(invalid_tags)}")
        if iob_seq_errors > 0:
            result.add_info(f"{iob_seq_errors} IOB sequence violations (I- without matching B-).")

    return result


def check_valid_entity_types(rows: List[Dict]) -> ValidationResult:
    """Check 5: All entity types in B-/I- tags are from the known set."""
    result = ValidationResult("Valid Entity Types")
    unknown_types = Counter()

    for idx, row in enumerate(rows):
        tags = row.get("tags", [])
        if not isinstance(tags, list):
            continue
        for tag in tags:
            if tag.startswith("B-") or tag.startswith("I-"):
                entity_type = tag[2:]
                if entity_type not in VALID_ENTITY_TYPES:
                    unknown_types[entity_type] += 1
                    result.fail(
                        f"Row {idx}: Unknown entity type '{entity_type}' in tag '{tag}'",
                        row_idx=idx,
                    )

    if result.passed:
        result.add_info("All entity types are from the known set.")
    else:
        result.add_info(f"Unknown entity types: {dict(unknown_types)}")

    return result


def check_no_duplicates(rows: List[Dict]) -> ValidationResult:
    """Check 6: No duplicate utterances (case-insensitive)."""
    result = ValidationResult("No Duplicate Utterances")
    seen = {}
    duplicates = 0

    for idx, row in enumerate(rows):
        utterance = row.get("utterance", "")
        key = utterance.strip().lower()
        if not key:
            # Build key from tokens if utterance missing
            key = " ".join(row.get("tokens", [])).strip().lower()

        if key in seen:
            duplicates += 1
            if duplicates <= 10:  # Only log first 10
                result.fail(
                    f"Row {idx}: Duplicate of row {seen[key]} — '{utterance[:60]}...'",
                    row_idx=idx,
                )
            elif duplicates == 11:
                result.fail("... (additional duplicates suppressed)", row_idx=idx)
            else:
                # Still record invalid row index for --fix
                result.invalid_row_indices.append(idx)
                result.passed = False
        else:
            seen[key] = idx

    if result.passed:
        result.add_info(f"All {len(rows)} utterances are unique.")
    else:
        result.add_info(f"{duplicates} duplicate utterances found.")

    return result


def check_intent_balance(rows: List[Dict]) -> ValidationResult:
    """Check 7: Intent distribution balance (warn if any intent has < threshold samples)."""
    result = ValidationResult("Intent Distribution Balance")
    intent_counts = Counter(row.get("intent", "UNKNOWN") for row in rows)

    underrepresented = []
    for intent, count in sorted(intent_counts.items()):
        if count < INTENT_BALANCE_THRESHOLD:
            underrepresented.append((intent, count))
            result.warn(
                f"Intent '{intent}' has only {count} samples "
                f"(threshold: {INTENT_BALANCE_THRESHOLD})"
            )

    if underrepresented:
        result.add_info(
            f"{len(underrepresented)} intents below {INTENT_BALANCE_THRESHOLD}-sample threshold."
        )
    else:
        result.add_info(
            f"All intents have ≥{INTENT_BALANCE_THRESHOLD} samples."
        )

    return result


def check_multi_entity_coverage(rows: List[Dict]) -> ValidationResult:
    """Check 8: At least 10% of samples should have 2+ entities."""
    result = ValidationResult("Multi-Entity Coverage")

    multi_entity_count = 0
    for row in rows:
        tags = row.get("tags", [])
        if not isinstance(tags, list):
            continue
        b_count = sum(1 for t in tags if t.startswith("B-"))
        if b_count >= 2:
            multi_entity_count += 1

    total = len(rows)
    if total == 0:
        result.fail("No rows in dataset.")
        return result

    pct = multi_entity_count / total * 100

    if pct < MULTI_ENTITY_MIN_PERCENT:
        result.warn(
            f"Only {pct:.1f}% of samples have 2+ entities "
            f"(minimum: {MULTI_ENTITY_MIN_PERCENT}%). "
            f"Count: {multi_entity_count}/{total}"
        )
    else:
        result.add_info(
            f"{pct:.1f}% of samples have 2+ entities "
            f"({multi_entity_count}/{total})."
        )

    return result


# ─── Reporting ───────────────────────────────────────────────────────────────────

def compute_distributions(rows: List[Dict]) -> Tuple[Counter, Counter]:
    """Compute intent and entity type distributions."""
    intent_counts = Counter()
    entity_counts = Counter()

    for row in rows:
        intent_counts[row.get("intent", "UNKNOWN")] += 1
        tags = row.get("tags", [])
        if isinstance(tags, list):
            for tag in tags:
                if tag.startswith("B-"):
                    entity_counts[tag[2:]] += 1

    return intent_counts, entity_counts


def print_distribution_table(title: str, counts: Counter, total_rows: int):
    """Print a formatted distribution table."""
    print(f"\n  {title}:")
    print(f"  {'─' * 50}")
    print(f"  {'Label':<30s} {'Count':>8s} {'%':>8s}")
    print(f"  {'─' * 50}")

    for label, count in sorted(counts.items(), key=lambda x: -x[1]):
        pct = count / total_rows * 100 if total_rows > 0 else 0
        bar = "█" * int(pct / 2)
        print(f"  {label:<30s} {count:>8d} {pct:>7.1f}% {bar}")

    print(f"  {'─' * 50}")
    print(f"  {'TOTAL':<30s} {sum(counts.values()):>8d}")


def print_report(
    results: List[ValidationResult],
    rows: List[Dict],
    filepath: str,
):
    """Print the full validation report."""
    print("\n" + "=" * 70)
    print("   DATASET VALIDATION REPORT")
    print("=" * 70)
    print(f"  File: {filepath}")
    print(f"  Rows: {len(rows)}")
    print()

    # Per-check results
    print("  VALIDATION CHECKS:")
    print(f"  {'─' * 60}")
    all_passed = True
    has_warnings = False

    for i, result in enumerate(results, 1):
        status = result.status
        print(f"  {i}. {result.name:<40s} {status}")

        if not result.passed:
            all_passed = False

        if result.warnings:
            has_warnings = True

        # Show first few errors
        for error in result.errors[:5]:
            print(f"     └─ {error}")
        if len(result.errors) > 5:
            print(f"     └─ ... and {len(result.errors) - 5} more errors")

        # Show warnings
        for warning in result.warnings[:5]:
            print(f"     └─ ⚠️  {warning}")
        if len(result.warnings) > 5:
            print(f"     └─ ... and {len(result.warnings) - 5} more warnings")

        # Show info
        for info in result.info:
            print(f"     └─ ℹ️  {info}")

    # Distribution tables
    intent_counts, entity_counts = compute_distributions(rows)
    print_distribution_table("🎯 INTENT DISTRIBUTION", intent_counts, len(rows))
    print_distribution_table("🏷️  ENTITY TYPE DISTRIBUTION", entity_counts, len(rows))

    # Final verdict
    print(f"\n{'=' * 70}")
    if all_passed and not has_warnings:
        print("  🟢 FINAL VERDICT: PASS — Dataset is ready for training!")
    elif all_passed and has_warnings:
        print("  🟡 FINAL VERDICT: PASS WITH WARNINGS — Review recommendations above.")
    else:
        total_errors = sum(len(r.errors) for r in results)
        print(f"  🔴 FINAL VERDICT: FAIL — {total_errors} error(s) found. Fix before training.")
    print("=" * 70 + "\n")

    return all_passed


def apply_fixes(
    rows: List[Dict],
    results: List[ValidationResult],
    output_path: str,
) -> int:
    """
    Auto-remove invalid rows identified by validation checks.
    Returns the number of rows removed.
    """
    # Collect all invalid row indices across checks
    invalid_indices: Set[int] = set()
    for result in results:
        invalid_indices.update(result.invalid_row_indices)

    if not invalid_indices:
        logger.info("No invalid rows to fix.")
        return 0

    # Write cleaned dataset
    valid_rows = [
        row for idx, row in enumerate(rows) if idx not in invalid_indices
    ]

    with open(output_path, "w", encoding="utf-8") as f:
        for row in valid_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    removed = len(invalid_indices)
    logger.info(
        "Fixed dataset written to %s (%d rows removed, %d rows remaining).",
        output_path,
        removed,
        len(valid_rows),
    )
    return removed


def main():
    parser = argparse.ArgumentParser(
        description="Validate dataset.jsonl for training readiness",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validator.py
      Validate the default dataset.jsonl

  python validator.py --input custom_dataset.jsonl
      Validate a custom file

  python validator.py --fix
      Validate and auto-remove invalid rows
        """,
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Input JSONL file to validate. Default: ../exported_dataset/dataset.jsonl",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Auto-remove invalid rows and write cleaned dataset",
    )
    parser.add_argument(
        "--fix-output",
        type=str,
        default=None,
        help="Output path for fixed dataset. Default: <input>_fixed.jsonl",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose (DEBUG) logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Resolve input path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    exported_dir = os.path.join(script_dir, "..", "exported_dataset")

    input_file = args.input or os.path.join(exported_dir, "dataset.jsonl")
    input_file = os.path.abspath(input_file)

    if not os.path.exists(input_file):
        logger.error("Input file not found: %s", input_file)
        sys.exit(1)

    # Load dataset
    logger.info("Loading dataset: %s", input_file)
    rows = []
    parse_errors = 0
    with open(input_file, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                parse_errors += 1
                logger.warning("Line %d: JSON parse error: %s", line_num, e)

    if parse_errors > 0:
        logger.warning("%d lines could not be parsed.", parse_errors)

    logger.info("Loaded %d rows from %s", len(rows), os.path.basename(input_file))

    if not rows:
        logger.error("Dataset is empty!")
        sys.exit(1)

    # Run all validation checks
    results = [
        check_required_fields(rows),
        check_token_tag_alignment(rows),
        check_valid_intents(rows),
        check_valid_iob_tags(rows),
        check_valid_entity_types(rows),
        check_no_duplicates(rows),
        check_intent_balance(rows),
        check_multi_entity_coverage(rows),
    ]

    # Print report
    all_passed = print_report(results, rows, input_file)

    # Apply fixes if requested
    if args.fix:
        fix_output = args.fix_output
        if fix_output is None:
            base, ext = os.path.splitext(input_file)
            fix_output = f"{base}_fixed{ext}"
        fix_output = os.path.abspath(fix_output)

        removed = apply_fixes(rows, results, fix_output)
        if removed > 0:
            print(f"  🔧 Fixed dataset: {fix_output}")
            print(f"     Removed {removed} invalid rows.\n")
        else:
            print("  🔧 No rows needed removal.\n")

    # Exit code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
