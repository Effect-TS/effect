#!/usr/bin/env bash
# Usage: hill-climb-tools/ab.sh "<case>[,<case>...]" [runs] [ms]: sorted ns/op per run on node and bun,
# using the bundled cases (rebuilt first). Run inside `nix develop` for the pinned Node and Bun.
cd "$(dirname "$0")"
node build-cases.mjs
runs="${2:-5}"; ms="${3:-1500}"
IFS=',' read -ra cs <<< "$1"
for c in "${cs[@]}"; do
for h in node bun; do
  vals=()
  for i in $(seq $runs); do vals+=($($h run-case.mjs "$c" $ms | awk '{print $(NF-1)}')); done
  printf "%s %s: %s\n" "$h" "$c" "$(printf "%s\n" "${vals[@]}" | sort -n | tr '\n' ' ')"
done
done
