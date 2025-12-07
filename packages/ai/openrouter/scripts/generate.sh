#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

temp_dir=$(mktemp -d)

cleanup() {
  rm -rf "${temp_dir}"
}

trap cleanup EXIT

openapi_spec_url="https://spec.speakeasy.com/openrouter/sdk/open-router-chat-completions-api-with-code-samples"
temp_file="${temp_dir}/openrouter.yaml"

touch "${temp_file}"
curl "${openapi_spec_url}" > "${temp_file}"

echo "/**
 * @since 1.0.0
 */" > src/Generated.ts

pnpm openapi-gen -s "${temp_file}" >> src/Generated.ts

pnpm eslint --fix src/Generated.ts

git apply --reject --whitespace=fix "${SCRIPT_DIR}/generated.patch"
