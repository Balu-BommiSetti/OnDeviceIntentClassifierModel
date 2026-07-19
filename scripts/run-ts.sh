#!/usr/bin/env bash
#
# TypeScript runner fallback.
#
# WHY THIS EXISTS: tsx's bundled esbuild binary is broken in this checkout
# ("Error [TransformError]: The service was stopped"), and `npm rebuild esbuild`
# fails too — so every `npm run <script>` that shells out to tsx dies. This
# script does what tsx would: compile with the TypeScript compiler (pure JS, no
# native binary), fix up ESM import extensions, run, then clean the artifacts.
#
# It is a WORKAROUND, not the intended path. Once `rm -rf node_modules
# package-lock.json && npm install` restores tsx, use the npm scripts directly
# and this file can be deleted.
#
# Usage:  ./scripts/run-ts.sh src/knowledge/patterns/expandPatterns.ts --dry-run
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ENTRY="${1:?usage: run-ts.sh <entry.ts> [args...]}"
shift || true

# Track which .js files existed BEFORE compiling so cleanup only removes ours
# (src/fix_inference.js is a real, tracked source file — never delete it).
BEFORE="$(mktemp)"
find src -name '*.js' 2>/dev/null | sort > "$BEFORE"

cleanup() {
  local after; after="$(mktemp)"
  find src -name '*.js' 2>/dev/null | sort > "$after"
  comm -13 "$BEFORE" "$after" | while read -r f; do [ -n "$f" ] && rm -f "$f"; done
  rm -f "$BEFORE" "$after"
}
trap cleanup EXIT

npx tsc "$ENTRY" \
  --target es2022 --module esnext --moduleResolution bundler \
  --outDir . --rootDir . --skipLibCheck >/dev/null 2>&1 || true

# tsc emits extensionless relative imports; Node's ESM loader requires ".js".
comm -13 "$BEFORE" <(find src -name '*.js' 2>/dev/null | sort) | while read -r f; do
  [ -n "$f" ] && perl -0pi -e 's/(from ")(\.[^"]*?)(")/$1$2.js$3/g; s/\.js\.js/.js/g' "$f"
done

node "${ENTRY%.ts}.js" "$@"
