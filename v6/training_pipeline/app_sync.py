#!/usr/bin/env python3
"""
Syncs binary model artifacts (tfjs/*, vocabulary.json, category_mapping.json)
into the app repo's assets/nlp/ directory — the ONLY directory the app
actually loads from at runtime (confirmed: ModelLoader.ts, IntentClassifier.ts,
VocabularyTokenizer.ts all require() from assets/nlp/, never from
src/ai/model/assets/, which is a stale, unused duplicate — see Phase 1's
findings in on_device_nlp_implementation_roadmap.md).

Paired with codegenApp.ts, which syncs labels.json + the route map into the
same app repo. Together these two scripts are the ONLY writers of app model
assets (Phase 4 item 3) — no more manual copies, no more silently-stale
duplicate directories.

Runs the export integrity check FIRST and refuses to sync a broken pairing.

Usage: python app_sync.py /path/to/wealthpilot_native_app [exported_model_dir]
"""
import os
import sys
import shutil

sys.path.insert(0, os.path.dirname(__file__))
from convert import check_export_integrity, IntegrityError

# labels.json ships here too: it must be byte-paired with the model weights
# (intent/task/slot index order IS the contract), and action_mask.json is the
# intent-conditioned taskType constraint the app MUST apply at inference —
# the harness gates measure WITH the mask, so an app that skips it ships
# behaviour the gates never saw (dead-route combos like ADD_LIABILITY|SCHEDULE).
FILES_TO_SYNC = ["vocabulary.json", "category_mapping.json", "labels.json", "action_mask.json"]


def sync(app_dir: str, export_dir: str = "exported_model"):
    app_nlp_dir = os.path.join(app_dir, "assets", "nlp")
    if not os.path.isdir(app_dir):
        raise FileNotFoundError(f"App directory not found: {app_dir}")

    print(f"[*] Verifying export integrity before syncing to {app_nlp_dir}...")
    check_export_integrity(export_dir)  # raises IntegrityError, refuses to sync a broken pairing

    os.makedirs(app_nlp_dir, exist_ok=True)
    os.makedirs(os.path.join(app_nlp_dir, "tfjs"), exist_ok=True)

    for fname in FILES_TO_SYNC:
        src = os.path.join(export_dir, fname)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(app_nlp_dir, fname))
            print(f"[*] Synced {fname}")
        else:
            print(f"[!] Warning: {src} not found, skipping")

    tfjs_src_dir = os.path.join(export_dir, "tfjs")
    tfjs_dst_dir = os.path.join(app_nlp_dir, "tfjs")
    synced_tfjs = []
    for fname in os.listdir(tfjs_src_dir):
        full_src = os.path.join(tfjs_src_dir, fname)
        if os.path.isfile(full_src):
            shutil.copy(full_src, os.path.join(tfjs_dst_dir, fname))
            synced_tfjs.append(fname)
    print(f"[*] Synced tfjs/ artifacts: {', '.join(sorted(synced_tfjs))}")

    # Remove orphaned tfjs files from PREVIOUS exports. A shard-count change
    # (2-shard -> 1-shard) leaves old .bin files beside the new model.json;
    # they are dead app-bundle weight AND a staleness trap (5.8MB of Jul-18
    # shards survived one sync exactly this way).
    for fname in os.listdir(tfjs_dst_dir):
        if fname not in synced_tfjs and os.path.isfile(os.path.join(tfjs_dst_dir, fname)):
            os.remove(os.path.join(tfjs_dst_dir, fname))
            print(f"[*] Removed orphaned {fname}")

    print(f"\n✅ App model assets synced to {app_nlp_dir}")
    print("   Note: labels.json + route map are synced separately via codegenApp.ts —")
    print("   run both (or use run_pipeline.sh --app) to keep the app repo fully in sync.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python app_sync.py /path/to/wealthpilot_native_app [exported_model_dir]", file=sys.stderr)
        sys.exit(2)
    app_dir = sys.argv[1]
    export_dir = sys.argv[2] if len(sys.argv) > 2 else "exported_model"
    try:
        sync(app_dir, export_dir)
    except IntegrityError as e:
        print(f"[!] Refusing to sync — export integrity check failed: {e}", file=sys.stderr)
        sys.exit(1)
