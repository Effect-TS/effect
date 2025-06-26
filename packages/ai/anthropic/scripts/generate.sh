#!/usr/bin/env sh
mkdir -p tmp
SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)
anthropic_stats_url="https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/refs/heads/main/.stats.yml"
openapi_spec_url=$(curl -sSL $anthropic_stats_url | yq '.openapi_spec_url')
curl $openapi_spec_url > tmp/anthropic.yaml
echo "/**
 * @since 1.0.0
 */" > src/Generated.ts
pnpm openapi-gen -s tmp/anthropic.yaml >> src/Generated.ts
pnpm eslint --fix src/Generated.ts
git apply $SCRIPT_DIR/response-text-block.patch
