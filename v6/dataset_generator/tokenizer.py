#!/usr/bin/env python3
"""
Tokenizer: Raw Entity Annotations → IOB-Tagged Token Sequences

Converts LLM-generated dataset rows (with entity annotations) into
IOB-tagged token sequences compatible with train.py's tokenizer.

Input:  JSONL with {utterance, intent, taskType, entities[{type, value}]}
Output: JSONL with {utterance, intent, taskType, tokens[], tags[]}

Author: NLP Pipeline Team
"""

import argparse
import json
import logging
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Tuple

# ─── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── Tokenizer (MUST match train.py exactly) ────────────────────────────────────
_CURRENCY_SYMBOLS = re.compile(r'[$₹£€₨]')
_SENTENCE_PUNCT = re.compile(r'(?<!\d)[.,](?!\d)|[?!]')


def clean_tokenize(text: str) -> List[str]:
    """
    Normalized whitespace split with numeric-aware punctuation handling.
    This function MUST produce identical output to train.py's clean_tokenize().
    """
    text_clean = _CURRENCY_SYMBOLS.sub('', text.lower())
    text_clean = _SENTENCE_PUNCT.sub(' ', text_clean)
    tokens = [t.strip() for t in text_clean.split() if t.strip()]
    return tokens


def normalize_entity_type(entity_type: str) -> str:
    """
    Normalize entity type by removing underscores.
    e.g. PAYMENT_METHOD → PAYMENTMETHOD
    """
    return entity_type.replace("_", "").upper()


def find_subsequence(haystack: List[str], needle: List[str]) -> Optional[int]:
    """
    Finds the starting index of `needle` as a contiguous subsequence in `haystack`.
    Both are compared case-insensitively (should already be lowered, but defensive).
    Returns the index of first match, or None if not found.
    """
    if not needle:
        return None
    needle_len = len(needle)
    haystack_len = len(haystack)
    for i in range(haystack_len - needle_len + 1):
        if all(haystack[i + j].lower() == needle[j].lower() for j in range(needle_len)):
            return i
    return None


def align_entities_to_iob(
    utterance_tokens: List[str],
    entities: List[Dict],
) -> Tuple[List[str], List[Dict], List[Dict]]:
    """
    Aligns entity annotations to IOB tags over the utterance tokens.

    Algorithm:
      1. For each entity, tokenize entity value with clean_tokenize()
      2. Find entity tokens as contiguous subsequence within utterance tokens
      3. Tag first token as B-{TYPE}, subsequent tokens as I-{TYPE}
      4. First match wins for overlaps (already-tagged positions are skipped)
      5. Unmatched tokens receive 'O'

    Returns:
      - tags: List[str] of IOB tags aligned to utterance_tokens
      - matched_entities: entities that were successfully aligned
      - missed_entities: entities that could not be found in utterance tokens
    """
    tags = ["O"] * len(utterance_tokens)
    occupied = [False] * len(utterance_tokens)  # Track positions already tagged
    matched_entities = []
    missed_entities = []

    for entity in entities:
        entity_type = normalize_entity_type(entity.get("type", ""))
        entity_value = entity.get("value", "")

        if not entity_type or not entity_value:
            logger.debug("Skipping entity with empty type or value: %s", entity)
            missed_entities.append(entity)
            continue

        # Tokenize entity value using same tokenizer
        entity_tokens = clean_tokenize(entity_value)
        if not entity_tokens:
            logger.debug(
                "Entity value '%s' produces no tokens after clean_tokenize",
                entity_value,
            )
            missed_entities.append(entity)
            continue

        # Find entity tokens as subsequence in utterance tokens
        match_start = None
        needle_len = len(entity_tokens)

        for i in range(len(utterance_tokens) - needle_len + 1):
            # Check if this position range is already occupied
            if any(occupied[i + j] for j in range(needle_len)):
                continue
            # Check if tokens match
            if all(
                utterance_tokens[i + j].lower() == entity_tokens[j].lower()
                for j in range(needle_len)
            ):
                match_start = i
                break

        if match_start is not None:
            # Tag the matched tokens
            for j in range(needle_len):
                prefix = "B" if j == 0 else "I"
                tags[match_start + j] = f"{prefix}-{entity_type}"
                occupied[match_start + j] = True
            matched_entities.append(entity)
        else:
            missed_entities.append(entity)

    return tags, matched_entities, missed_entities


def process_row(row: Dict, row_idx: int) -> Optional[Dict]:
    """
    Processes a single raw dataset row into IOB-tagged format.

    Returns the transformed row dict, or None if the row is invalid.
    """
    utterance = row.get("utterance", "")
    intent = row.get("intent", "")
    task_type = row.get("taskType", "")
    entities = row.get("entities", [])

    if not utterance or not intent:
        logger.warning("Row %d: Missing utterance or intent, skipping.", row_idx)
        return None

    # Tokenize utterance
    tokens = clean_tokenize(utterance)
    if not tokens:
        logger.warning(
            "Row %d: Utterance '%s' produced no tokens, skipping.",
            row_idx,
            utterance[:60],
        )
        return None

    # Align entities to IOB tags
    tags, matched, missed = align_entities_to_iob(tokens, entities)

    # Log warnings for missed entities
    for entity in missed:
        logger.warning(
            "Row %d: Entity {type=%s, value='%s'} not found in tokens of '%s'",
            row_idx,
            entity.get("type", "?"),
            entity.get("value", "?"),
            utterance[:80],
        )

    result = {
        "utterance": utterance,
        "intent": intent,
        "taskType": task_type,
        "tokens": tokens,
        "tags": tags,
    }

    return result


def load_jsonl(filepath: str) -> List[Dict]:
    """Loads a JSONL file, returning list of parsed dicts."""
    rows = []
    if not os.path.exists(filepath):
        logger.error("File not found: %s", filepath)
        return rows

    logger.info("Loading: %s", filepath)
    line_count = 0
    parse_errors = 0
    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            line_count += 1
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                parse_errors += 1
                logger.warning("Line %d: JSON parse error: %s", line_num, e)

    logger.info(
        "  → Loaded %d rows (%d parse errors) from %s",
        len(rows),
        parse_errors,
        os.path.basename(filepath),
    )
    return rows


def is_already_tokenized(row: Dict) -> bool:
    """Check if a row already has tokens and tags (existing dataset format)."""
    return (
        isinstance(row.get("tokens"), list)
        and isinstance(row.get("tags"), list)
        and len(row["tokens"]) > 0
        and len(row["tags"]) > 0
    )


def process_file(filepath: str) -> Tuple[List[Dict], Dict]:
    """
    Process a single JSONL input file.
    Handles both:
      - Raw format: {utterance, intent, taskType, entities[]} → needs tokenization
      - Already-tokenized format: {tokens, tags} → pass through

    Returns:
      - results: list of processed rows
      - stats: dict of statistics for this file
    """
    raw_rows = load_jsonl(filepath)
    results = []
    stats = {
        "file": os.path.basename(filepath),
        "total_input_rows": len(raw_rows),
        "already_tokenized": 0,
        "newly_tokenized": 0,
        "skipped_invalid": 0,
        "total_entities_attempted": 0,
        "entities_matched": 0,
        "entities_missed": 0,
        "entity_type_counts": Counter(),
        "intent_counts": Counter(),
    }

    for idx, row in enumerate(raw_rows):
        # Check if already in tokenized format
        if is_already_tokenized(row):
            # Pass through — already has tokens and tags
            result = {
                "utterance": row.get("utterance", " ".join(row.get("tokens", []))),
                "intent": row.get("intent", ""),
                "taskType": row.get("taskType", ""),
                "tokens": row["tokens"],
                "tags": row["tags"],
            }
            results.append(result)
            stats["already_tokenized"] += 1
            stats["intent_counts"][row.get("intent", "UNKNOWN")] += 1

            # Count entity tags for stats
            for tag in row["tags"]:
                if tag.startswith("B-"):
                    stats["entity_type_counts"][tag[2:]] += 1

            continue

        # Raw format — needs tokenization
        entities = row.get("entities", [])
        stats["total_entities_attempted"] += len(entities)

        processed = process_row(row, idx)
        if processed is None:
            stats["skipped_invalid"] += 1
            continue

        # Count matched/missed
        utterance_tokens = processed["tokens"]
        tags = processed["tags"]
        for tag in tags:
            if tag.startswith("B-"):
                stats["entities_matched"] += 1
                stats["entity_type_counts"][tag[2:]] += 1

        missed_count = len(entities) - sum(1 for t in tags if t.startswith("B-"))
        stats["entities_missed"] += max(0, missed_count)

        stats["newly_tokenized"] += 1
        stats["intent_counts"][processed["intent"]] += 1
        results.append(processed)

    return results, stats


def print_stats(all_stats: List[Dict], total_output: int):
    """Print comprehensive processing statistics."""
    print("\n" + "=" * 70)
    print("   TOKENIZER PROCESSING REPORT")
    print("=" * 70)

    total_input = 0
    total_tokenized = 0
    total_passthrough = 0
    total_skipped = 0
    total_entities_attempted = 0
    total_entities_matched = 0
    total_entities_missed = 0
    combined_entity_counts = Counter()
    combined_intent_counts = Counter()

    for stats in all_stats:
        print(f"\n  📄 {stats['file']}:")
        print(f"     Input rows:         {stats['total_input_rows']}")
        print(f"     Already tokenized:  {stats['already_tokenized']}")
        print(f"     Newly tokenized:    {stats['newly_tokenized']}")
        print(f"     Skipped (invalid):  {stats['skipped_invalid']}")
        if stats["total_entities_attempted"] > 0:
            match_rate = (
                stats["entities_matched"] / stats["total_entities_attempted"] * 100
            )
            print(f"     Entities attempted: {stats['total_entities_attempted']}")
            print(f"     Entities matched:   {stats['entities_matched']} ({match_rate:.1f}%)")
            print(f"     Entities missed:    {stats['entities_missed']}")

        total_input += stats["total_input_rows"]
        total_tokenized += stats["newly_tokenized"]
        total_passthrough += stats["already_tokenized"]
        total_skipped += stats["skipped_invalid"]
        total_entities_attempted += stats["total_entities_attempted"]
        total_entities_matched += stats["entities_matched"]
        total_entities_missed += stats["entities_missed"]
        combined_entity_counts.update(stats["entity_type_counts"])
        combined_intent_counts.update(stats["intent_counts"])

    print(f"\n{'─' * 70}")
    print(f"  📊 AGGREGATE SUMMARY:")
    print(f"     Total input rows:       {total_input}")
    print(f"     Total output rows:      {total_output}")
    print(f"     Newly tokenized:        {total_tokenized}")
    print(f"     Passed through:         {total_passthrough}")
    print(f"     Skipped:                {total_skipped}")
    if total_entities_attempted > 0:
        match_rate = total_entities_matched / total_entities_attempted * 100
        print(f"     Entity match rate:      {match_rate:.1f}% ({total_entities_matched}/{total_entities_attempted})")

    # Intent distribution
    print(f"\n  🎯 INTENT DISTRIBUTION:")
    for intent, count in sorted(combined_intent_counts.items(), key=lambda x: -x[1]):
        print(f"     {intent:<30s} {count:>6d}")

    # Entity type distribution
    if combined_entity_counts:
        print(f"\n  🏷️  ENTITY TYPE DISTRIBUTION:")
        for etype, count in sorted(combined_entity_counts.items(), key=lambda x: -x[1]):
            print(f"     {etype:<30s} {count:>6d}")

    print(f"\n{'=' * 70}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Convert raw entity-annotated dataset to IOB-tagged token sequences",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tokenizer.py
      Processes both llm_raw_dataset.jsonl and spec_dataset.jsonl → dataset.jsonl

  python tokenizer.py --input custom_data.jsonl --output custom_out.jsonl
      Process a single custom file

  python tokenizer.py --input file1.jsonl file2.jsonl --output merged.jsonl
      Process multiple files into one output
        """,
    )
    parser.add_argument(
        "--input",
        nargs="*",
        default=None,
        help="Input JSONL file(s). Default: llm_raw_dataset.jsonl + spec_dataset.jsonl",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSONL file. Default: ../exported_dataset/dataset.jsonl",
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

    # Resolve paths relative to this script's location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    exported_dir = os.path.join(script_dir, "..", "exported_dataset")

    # Default input files
    if args.input is None:
        default_inputs = [
            os.path.join(exported_dir, "llm_raw_dataset.jsonl"),
            os.path.join(exported_dir, "spec_dataset.jsonl"),
        ]
        # Filter to only files that exist
        input_files = [f for f in default_inputs if os.path.exists(f)]
        if not input_files:
            logger.error(
                "No default input files found. Expected at least one of:\n"
                "  - %s\n  - %s",
                default_inputs[0],
                default_inputs[1],
            )
            sys.exit(1)
        logger.info(
            "No --input specified. Using default files: %s",
            [os.path.basename(f) for f in input_files],
        )
    else:
        input_files = []
        for f in args.input:
            # Resolve relative to CWD
            resolved = os.path.abspath(f)
            if not os.path.exists(resolved):
                logger.error("Input file not found: %s", resolved)
                sys.exit(1)
            input_files.append(resolved)

    # Default output file
    output_file = args.output or os.path.join(exported_dir, "dataset.jsonl")
    output_file = os.path.abspath(output_file)

    print("=" * 70)
    print("   TOKENIZER: Raw Entities → IOB-Tagged Token Sequences")
    print("=" * 70)
    print(f"  Input files:  {len(input_files)}")
    for f in input_files:
        print(f"    → {os.path.relpath(f, script_dir)}")
    print(f"  Output file:  {os.path.relpath(output_file, script_dir)}")
    print()

    # Process all input files
    all_results = []
    all_stats = []
    seen_utterances = set()
    dedup_count = 0

    for filepath in input_files:
        results, stats = process_file(filepath)
        all_stats.append(stats)

        # Deduplicate across files (case-insensitive on utterance)
        for row in results:
            utterance_key = row["utterance"].strip().lower()
            if utterance_key in seen_utterances:
                dedup_count += 1
                continue
            seen_utterances.add(utterance_key)
            all_results.append(row)

    if dedup_count > 0:
        logger.info("Deduplicated %d rows across input files.", dedup_count)

    # Write output
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        for row in all_results:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    logger.info("Wrote %d rows to %s", len(all_results), output_file)

    # Print statistics
    print_stats(all_stats, len(all_results))

    if dedup_count > 0:
        print(f"  ⚠️  Removed {dedup_count} duplicate utterances across files.\n")

    print(f"  ✅ Output: {output_file}")
    print(f"     {len(all_results)} total rows written.\n")


if __name__ == "__main__":
    main()
