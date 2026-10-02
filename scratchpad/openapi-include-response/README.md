# OpenAPI `includeResponse` reproduction and fix

The [reproduction branch](https://github.com/bastiankistner/effect/tree/codex/repro-openapi-include-response) isolates the original failure. This branch, [`codex/fix-openapi-include-response`](https://github.com/bastiankistner/effect/tree/codex/fix-openapi-include-response), includes the correction.

After cloning this branch, run the following from the repository root using the repository's pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm test --run packages/tools/openapi-generator/test/OpenApiGenerator.test.ts -t "preserves dynamic includeResponse"
pnpm test --run packages/tools/openapi-generator/test/OpenApiTransformer.test.ts -t "returns the response tuple when includeResponse is true"
```

The first command generates a one-endpoint client in both `httpclient` and `httpclient-type-only` formats. TypeScript checks omitted options, literal `true`, literal `false`, dynamic `boolean`, optional boolean, optional `true`, optional `false`, the broad `OperationConfig` type, and a config union. All cases pass on this fix branch. On baseline, both format-specific checks fail with TS2344 because a dynamic `includeResponse` value is inferred as body-only. The second command confirms that passing `true` returns `[body, response]` at runtime in both formats.

| Branch       | Generated client type check                         | Runtime with `includeResponse: true` |
| ------------ | --------------------------------------------------- | ------------------------------------ |
| Reproduction | Fails with TS2344 for dynamic boolean options       | Returns `[body, response]`           |
| Fix          | Passes for both formats and all option shapes above | Returns `[body, response]`           |

On baseline `157690fcf4a5e54d581dbd6c190050f7971ee405` (Effect `origin/main`), the original focused tests fail during their generated-client compile step. TypeScript reports that `DynamicResponse` does not satisfy `true`: the generated `WithOptionalResponse` conditional infers only `string` for a dynamic `boolean`, despite the runtime returning `[body, response]` when the value is `true`.
