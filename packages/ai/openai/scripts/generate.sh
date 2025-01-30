#!/usr/bin/env sh
mkdir -p tmp
curl https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml > tmp/openapi.yaml
echo "/**
 * @since 1.0.0
 */" > src/Generated.ts
pnpm openapi-gen -s tmp/openapi.yaml >> src/Generated.ts
pnpm eslint --fix src/Generated.ts
