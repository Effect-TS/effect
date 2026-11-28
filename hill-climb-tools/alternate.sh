#!/usr/bin/env bash
# Measures head and the base worktree in alternating chunks, so both see the same
# drift in machine load, then merges each side's chunks into one report.
#
#   hill-climb-tools/alternate.sh OUT_DIR [chunks] [rounds per chunk]
#
# Run inside `nix develop` from the repo root, on a committed tree, with the base
# worktree that `pnpm bundle-compare` leaves in tmp/bundle-base. Writes
# OUT_DIR/hostperf-head.json, OUT_DIR/hostperf-main-alternating.json and the
# load average before each chunk in OUT_DIR/alternate.log.
set -uo pipefail
mkdir -p "$1"
out="$(realpath "$1")"; chunks="${2:-3}"; rounds="${3:-5}"
root="$(git rev-parse --show-toplevel)"
cd "$root"
: > "$out/alternate.log"
run() {
  echo "$(date +%T) $1 chunk $2, load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$out/alternate.log"
  (cd "$3" && pnpm hostperf --host node,bun,chromium --rounds "$rounds" --out "$out/chunk-$1-$2.json") \
    >> "$out/alternate.log" 2>&1
}
for i in $(seq "$chunks"); do
  # Swap the order every chunk so neither side always runs first
  if [ $((i % 2)) -eq 1 ]; then run head "$i" "$root"; run main "$i" "$root/tmp/bundle-base"
  else run main "$i" "$root/tmp/bundle-base"; run head "$i" "$root"; fi
done
node hill-climb-tools/merge-reports.ts "$out/hostperf-head.json" "$out"/chunk-head-*.json
node hill-climb-tools/merge-reports.ts "$out/hostperf-main-alternating.json" "$out"/chunk-main-*.json
