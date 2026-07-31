# Example Suggestions: `@effect/api-diff/Error`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Error.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind               | Priority        |
| ------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Error.ApiDiffError` |    3 | `unmodeled-export` | **recommended** |

## Recommended

### `@effect/api-diff/Error.ApiDiffError`

- **Source:** `packages/tools/api-diff/src/Error.ts:3`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class ApiDiffError extends Schema.TaggedErrorClass<ApiDiffError>()("ApiDiffError", { message: Schema.String, cause: Schema.optional(Schema.Defect()) }) {}`
- **Import guidance:** Start from `import { ApiDiffError } from "@effect/api-diff/Error"` and use `ApiDiffError`.
- **Suggested snippet:** Create or capture `ApiDiffError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
