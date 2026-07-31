# Example Suggestions: `@effect/api-diff/Cli`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Cli.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                        | Line | Kind               | Priority     |
| -------------------------- | ---: | ------------------ | ------------ |
| `@effect/api-diff/Cli.cli` |   52 | `unmodeled-export` | **optional** |

## Optional

### `@effect/api-diff/Cli.cli`

- **Source:** `packages/tools/api-diff/src/Cli.ts:52`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const cli = Command.make("api-diff", { baseRef, headRef, output, writeDoc, check }).pipe( Command.withDescription("Compare the consumer-visible TypeScript API of two repository revisions"), Command.withHandler(runApiDiff) )`
- **Import guidance:** Start from `import { cli } from "@effect/api-diff/Cli"` and use `cli`.
- **Suggested snippet:** Use `cli` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
