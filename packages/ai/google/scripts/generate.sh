#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)

if [[ -z "${GOOGLE_API_KEY:-}" ]]; then
  echo "Error: GOOGLE_API_KEY environment variable is not set."
  exit 1
fi

base_url="https://generativelanguage.googleapis.com/"
temp_dir=$(mktemp -d)
openapi_spec="./openapi.json"

curl -o "${openapi_spec}" "${base_url}\$discovery/OPENAPI3_0?version=v1beta&key=${GOOGLE_API_KEY}"

echo "/**
 * @since 1.0.0
 */" > src/Generated.ts

pnpm openapi-gen -s "${openapi_spec}" >> src/Generated.ts
node "${SCRIPT_DIR}/transform.cjs" "$(pwd)/src/Generated.ts"
pnpm eslint --fix src/Generated.ts

rm "${openapi_spec}"
