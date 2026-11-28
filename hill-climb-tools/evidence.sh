#!/usr/bin/env bash
# Collects a round's hand-over evidence into OUT_DIR and records each step's
# exit status and duration in OUT_DIR/validation.txt.
#
#   hill-climb-tools/evidence.sh OUT_DIR PINNED_MAIN_REPORT.json [rounds] [scoped test files...]
#
# Run inside `nix develop` from the repo root, on a committed tree. Needs the
# built main worktree that `pnpm bundle-compare main` leaves in tmp/bundle-base.
# Timing steps run first and alone; the checks that load every core run after.
set -uo pipefail
mkdir -p "$1"
out="$(realpath "$1")"; pinned="$(realpath "$2")"; rounds="${3:-10}"; shift 3 || true
cd "$(git rev-parse --show-toplevel)"
status="$out/validation.txt"
{
  echo "commit: $(git rev-parse HEAD)"
  echo "tracked changes: $(git status --porcelain --untracked-files=no | wc -l)"
  echo "node $(node --version), bun $(bun --version)"
  echo
} > "$status"

step() {
  local name="$1"; shift
  local start=$SECONDS
  "$@" > "$out/$name.log" 2>&1
  local code=$?
  echo "$name: exit $code, $((SECONDS - start))s: $*" >> "$status"
}

# Head against the pinned baseline, then main re-measured in this session
step hostperf pnpm hostperf --host node,bun,chromium --rounds "$rounds" \
  --baseline "$pinned" --out "$out/hostperf-head.json"
(cd tmp/bundle-base && step hostperf-main-same-session pnpm hostperf --host node,bun,chromium \
  --rounds "$rounds" --out "$out/hostperf-main-same-session.json")
node hill-climb-tools/compare-reports.ts "$pinned" "$out/hostperf-head.json" > "$out/hostperf-vs-pinned-main.txt"
node hill-climb-tools/compare-reports.ts "$out/hostperf-main-same-session.json" "$out/hostperf-head.json" \
  > "$out/hostperf-vs-same-session-main.txt"

step chromium-verify node hill-climb-tools/chromium-verify.mjs
step bundle-compare pnpm bundle-compare main
cp tmp/bundle-stats.txt "$out/bundle-stats.txt"
node hill-climb-tools/bundle-bytes.ts > "$out/bundle-bytes-min-gzip.md" 2>> "$out/bundle-compare.log"

if [ "$#" -gt 0 ]; then step scoped-tests pnpm vitest run "$@"; fi
step full-effect-suite pnpm vitest run --project effect
step lint pnpm lint
# `pnpm check` also type-checks the main worktree's copy, so run it last and without it
git worktree remove --force tmp/bundle-base
step check pnpm check
cat "$status"
