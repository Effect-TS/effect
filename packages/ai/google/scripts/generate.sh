#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "Error: GOOGLE_API_KEY environment variable is not set."
  exit 1
fi

base_url="https://generativelanguage.googleapis.com/"
temp_dir=$(mktemp -d)

cleanup() {
  rm -rf "${temp_dir}"
}

trap cleanup EXIT

curl "${base_url}\$discovery/OPENAPI3_0?version=v1beta&key=${GOOGLE_API_KEY}" > "${temp_dir}/openapi.json"

echo "/**
 * @since 1.0.0
 */" > src/Generated.ts

pnpm openapi-gen -s "${temp_dir}/openapi.json" >> src/Generated.ts

git apply --reject --whitespace=fix "${SCRIPT_DIR}/generated.patch"

pnpm eslint --fix src/Generated.ts
