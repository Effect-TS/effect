#!/usr/bin/env sh
mkdir -p tmp
SCRIPT_DIR=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)
curl https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml > tmp/openapi.yaml
echo "/**
 * @since 1.0.0
 */" > src/Generated.ts
pnpm openapi-gen -s tmp/openapi.yaml >> src/Generated.ts
pnpm eslint --fix src/Generated.ts
git apply $SCRIPT_DIR/create-chat-completions-response.patch
