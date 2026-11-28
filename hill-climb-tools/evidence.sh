#!/usr/bin/env bash
# Collects a round's hand-over evidence into OUT_DIR and records each step's
# exit status and duration in OUT_DIR/validation.txt.
#
#   [BASE_REF=<ref>] hill-climb-tools/evidence.sh OUT_DIR PINNED_MAIN_REPORT.json [chunks] [rounds] [scoped test files...]
#
# Run inside `nix develop` from the repo root, on a committed tree. Needs the
# built base worktree that `pnpm bundle-compare $BASE_REF` leaves in tmp/bundle-base.
# BASE_REF defaults to `main`; pass the SHA when the checkout has no such branch.
# Timing steps run first and alone; the checks that load every core run after.
# The alternating hostperf run is skipped when OUT_DIR already holds its reports.
set -uo pipefail
mkdir -p "$1"
out="$(realpath "$1")"; pinned="$(realpath "$2")"; chunks="${3:-3}"; rounds="${4:-5}"; shift 4 || true
base="${BASE_REF:-main}"
cd "$(git rev-parse --show-toplevel)"
status="$out/validation.txt"
{
  echo "commit: $(git rev-parse HEAD)"
  echo "base: $(git rev-parse "$base")"
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

# Head and main in alternating chunks, then head against both baselines
if [ -f "$out/hostperf-head.json" ]; then
  echo "hostperf: reused the alternating run in $out (see alternate.log)" >> "$status"
else
  step hostperf hill-climb-tools/alternate.sh "$out" "$chunks" "$rounds"
fi
node hill-climb-tools/compare-reports.ts "$pinned" "$out/hostperf-head.json" > "$out/hostperf-vs-pinned-main.txt"
node hill-climb-tools/compare-reports.ts "$out/hostperf-main-alternating.json" "$out/hostperf-head.json" \
  > "$out/hostperf-vs-main-alternating.txt"

step chromium-verify node hill-climb-tools/chromium-verify.mjs
step bundle-compare pnpm bundle-compare "$base"
cp tmp/bundle-stats.txt "$out/bundle-stats.txt"
node hill-climb-tools/bundle-bytes.ts > "$out/bundle-bytes-min-gzip.md" 2>> "$out/bundle-compare.log"

if [ "$#" -gt 0 ]; then step scoped-tests pnpm vitest run "$@"; fi
step full-effect-suite pnpm vitest run --project effect
step lint pnpm lint
# `pnpm check` also type-checks the base worktree's copy, so run it last and without it
git worktree remove --force tmp/bundle-base
step check pnpm check
cat "$status"
