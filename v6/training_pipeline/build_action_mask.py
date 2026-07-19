#!/usr/bin/env python3
"""
Generates exported_model/action_mask.json from the intent specs.

WHY THIS IS PART OF THE PIPELINE AND NOT A ONE-OFF
The mask was first built by hand (2026-07-19, iteration 18). One iteration
later SIP_VS_PREPAY gained COMPARISON and WHAT_IF in its spec — and the stale
mask silently FORCED every SIP prediction back to SUMMARY through two full
training runs, making the new buckets unpassable at inference while the
training metrics said they were learned. A constraint derived from the specs
must regenerate whenever the specs can have changed: train.py calls this at
export time, and app_sync.py ships the result to the app.
"""
import glob
import json
import os

SPECS_GLOB = os.path.join(os.path.dirname(__file__), "..", "..", "src", "knowledge", "specs", "*.intent.json")


def build(export_dir: str = "exported_model") -> dict:
    mask = {}
    for f in sorted(glob.glob(SPECS_GLOB)):
        with open(f) as fh:
            s = json.load(fh)
        mask[s["intent"]] = sorted(s["supported_actions"]) or ["NONE"]
    if "UNKNOWN" not in mask:
        mask["UNKNOWN"] = ["NONE"]

    out = {
        "_comment": ("intent -> taskTypes the product can serve, REGENERATED from each spec's "
                     "supported_actions at every training export (see module docstring for why "
                     "a stale copy is worse than none). Inference must argmax the task head "
                     "over ONLY the allowed set for the predicted intent."),
        "allowed": mask,
    }
    path = os.path.join(export_dir, "action_mask.json")
    with open(path, "w") as fh:
        json.dump(out, fh, indent=2)
    print(f"[*] action_mask.json regenerated: {len(mask)} intents")
    return out


if __name__ == "__main__":
    build()
