# Example Suggestions: `@effect/api-diff/ApiDiff`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/ApiDiff.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/ApiDiff.ApiDiff`        |   30 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/ApiDiff.ApiDiffOptions` |   22 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/ApiDiff.ApiDiff`

- **Source:** `packages/tools/api-diff/src/ApiDiff.ts:30`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class ApiDiff extends Context.Service<ApiDiff, { readonly run: (options: ApiDiffOptions) => Effect.Effect<void, ApiDiffError> }>()("@effect/api-diff/ApiDiff") { static readonly layerNoDependencies = Layer.effect( ApiDiff, Effect.gen(function*() { const fs = yield* FileSystem.FileSystem const path = yield* Path.Path const worktrees = yield* Worktrees const absolute = (repoRoot: string, location: string): string => path.isAbsolute(location) ? location : path.resolve(repoRoot, location) cons`
- **Import guidance:** Start from `import { ApiDiff } from "@effect/api-diff/ApiDiff"` and use `ApiDiff`.
- **Suggested snippet:** Consume `ApiDiff` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/ApiDiff.ApiDiffOptions`

- **Source:** `packages/tools/api-diff/src/ApiDiff.ts:22`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface ApiDiffOptions { readonly baseRef: string readonly headRef: string readonly output?: string | undefined readonly writeDoc?: string | undefined readonly check: boolean }`
- **Import guidance:** Start from `import { ApiDiffOptions } from "@effect/api-diff/ApiDiff"` and use `ApiDiffOptions`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ApiDiffOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
