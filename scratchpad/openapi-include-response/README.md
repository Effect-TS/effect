# OpenAPI `includeResponse` reproduction

After cloning this branch, run the following from the repository root using the repository's pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm test --run packages/tools/openapi-generator/test/OpenApiGenerator.test.ts -t "preserves dynamic includeResponse"
pnpm test --run packages/tools/openapi-generator/test/OpenApiTransformer.test.ts -t "returns the response tuple when includeResponse is true"
```

The first command generates a one-endpoint client in both `httpclient` and `httpclient-type-only` formats, then asks TypeScript to verify that a dynamic `boolean` option yields `string | [string, HttpClientResponse]`. On baseline, both format-specific checks fail with TS2344 because the inferred success type is only `string`. The second command confirms that passing `true` returns `[body, response]` at runtime in both formats.

On baseline `157690fcf4a5e54d581dbd6c190050f7971ee405` (Effect `origin/main`), the focused test fails during its generated-client compile step. TypeScript reports that `DynamicResponse` does not satisfy `true`: the generated `WithOptionalResponse` conditional infers only `string` when `includeResponse` is `boolean`, despite the runtime returning `[body, response]` when the value is `true`.
