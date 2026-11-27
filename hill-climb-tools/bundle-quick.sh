#!/usr/bin/env bash
# Rebuilds only packages/effect (~10s) and compares every fixture against the
# base worktree that `pnpm bundle-compare main` leaves in tmp/bundle-base.
# Run inside `nix develop`.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/packages/effect" && pnpm build > "$ROOT/tmp/effect-build.log" 2>&1
cd "$ROOT" && node packages/tools/bundle/src/bin.ts compare --base-dir tmp/bundle-base/packages/tools/bundle/fixtures --output-path tmp/bsize.txt > /dev/null 2>&1
grep -E "basic|queue.ts|stream.ts|schema.ts|http-router" tmp/bsize.txt
awk -F'|' 'NR>2 { gsub(/[ KB+]/, "", $5); split($5, a, "("); s += a[1]; n++ } END { printf "total diff %.2f KB over %d fixtures\n", s, n }' tmp/bsize.txt
