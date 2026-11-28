#!/usr/bin/env bash
# usage: [PIN="taskset -c N"] abx.sh A_DIR B_DIR "case,case" [runs] [ms] [hosts]
# Alternates runs of two prebuilt bundles (build-cases.mjs HC_OUT dirs) and
# prints the median ns/op of each; A/B above 1 means B is faster.
cd "$(dirname "$0")"
IFS=',' read -ra cs <<< "$3"
for c in "${cs[@]}"; do
for h in ${6:-node bun}; do
  a=(); b=()
  for i in $(seq ${4:-5}); do
    a+=($(HC_OUT=$1 ${PIN:-} $h run-case.mjs "$c" ${5:-800} | awk '{print $(NF-1)}'))
    b+=($(HC_OUT=$2 ${PIN:-} $h run-case.mjs "$c" ${5:-800} | awk '{print $(NF-1)}'))
  done
  ma=$(printf "%s\n" "${a[@]}" | sort -n | awk '{v[NR]=$1} END{print v[int((NR+1)/2)]}')
  mb=$(printf "%s\n" "${b[@]}" | sort -n | awk '{v[NR]=$1} END{print v[int((NR+1)/2)]}')
  printf "%-5s %-28s A %8s  B %8s  A/B %s\n" $h "$c" $ma $mb $(awk "BEGIN{printf \"%.3f\", $ma/$mb}")
done
done
