#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

temp_dir=$(mktemp -d)

cleanup() {
  rm -rf "${temp_dir}"
}

trap cleanup EXIT

anthropic_stats_url="https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/refs/heads/main/.stats.yml"

openapi_spec_url="$(curl -sSL $anthropic_stats_url | yq ".openapi_spec_url")"

curl "${openapi_spec_url}" > "${temp_dir}/anthropic.yaml"

echo "/**
 * @since 1.0.0
 */" > src/Generated.ts

pnpm openapi-gen -s "${temp_dir}/anthropic.yaml" >> src/Generated.ts

pnpm eslint --fix src/Generated.ts

# No patch required at this time
git apply --reject --whitespace=fix "${SCRIPT_DIR}/generated.patch"
