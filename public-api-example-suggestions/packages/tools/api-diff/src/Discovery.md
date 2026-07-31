# Example Suggestions: `@effect/api-diff/Discovery`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Discovery.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Discovery.Discovery`       |   64 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Discovery.DiscoveryResult` |   29 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Discovery.Discovery`

- **Source:** `packages/tools/api-diff/src/Discovery.ts:64`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class Discovery extends Context.Service<Discovery, { readonly discoverEntrypoints: ( repoRoot: string, requestedModules?: ReadonlyArray<string> ) => Effect.Effect<DiscoveryResult, ApiDiffError> }>()("@effect/api-diff/Discovery") { static readonly layer = Layer.effect( Discovery, Effect.gen(function*() { const fs = yield* FileSystem.FileSystem const path = yield* Path.Path const readManifest = Effect.fnUntraced(function*(location: string) { const source = yield* fs.readFileString(location)`
- **Import guidance:** Start from `import { Discovery } from "@effect/api-diff/Discovery"` and use `Discovery`.
- **Suggested snippet:** Consume `Discovery` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Discovery.DiscoveryResult`

- **Source:** `packages/tools/api-diff/src/Discovery.ts:29`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface DiscoveryResult { readonly entrypoints: ReadonlyArray<Entrypoint> readonly missing: ReadonlyArray<string> }`
- **Import guidance:** Start from `import { DiscoveryResult } from "@effect/api-diff/Discovery"` and use `DiscoveryResult`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `DiscoveryResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
