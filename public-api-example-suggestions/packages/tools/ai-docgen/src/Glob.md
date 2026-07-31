# Example Suggestions: `@effect/ai-docgen/Glob`

- **Package:** `@effect/ai-docgen`
- **Source:** `packages/tools/ai-docgen/src/Glob.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind               | Priority        |
| ---------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-docgen/Glob.layer`     |   42 | `unmodeled-export` | **recommended** |
| `@effect/ai-docgen/Glob.GlobError` |   18 | `unmodeled-export` | **recommended** |
| `@effect/ai-docgen/Glob.Glob`      |   29 | `unmodeled-export` | **recommended** |

## Recommended

### `@effect/ai-docgen/Glob.layer`

- **Source:** `packages/tools/ai-docgen/src/Glob.ts:42`
- **Kind / category:** `unmodeled-export` / `layers`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** Layer providing the Glob service.
- **Signature hint:** `export const layer: Layer.Layer<Glob> = Layer.succeed(Glob, { glob: (pattern, options) => Effect.tryPromise({ try: () => GlobLib.glob(pattern as string | Array<string>, options ?? {}) as Promise<Array<string>>, catch: (cause) => new GlobError({ pattern, cause }) }) })`
- **Import guidance:** Start from `import { layer } from "@effect/ai-docgen/Glob"` and use `layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-docgen/Glob.GlobError`

- **Source:** `packages/tools/ai-docgen/src/Glob.ts:18`
- **Kind / category:** `unmodeled-export` / `errors`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** Error during glob pattern matching.
- **Signature hint:** `export class GlobError extends Data.TaggedError("GlobError")<{ readonly pattern: string | ReadonlyArray<string> readonly cause: unknown }> {}`
- **Import guidance:** Start from `import { GlobError } from "@effect/ai-docgen/Glob"` and use `GlobError`.
- **Suggested snippet:** Create or capture `GlobError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-docgen/Glob.Glob`

- **Source:** `packages/tools/ai-docgen/src/Glob.ts:29`
- **Kind / category:** `unmodeled-export` / `services`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** Context service for glob pattern matching used by AI docgen tooling.
- **Signature hint:** `export class Glob extends Context.Service<Glob, { readonly glob: ( pattern: string | ReadonlyArray<string>, options?: GlobLib.GlobOptions ) => Effect.Effect<Array<string>, GlobError> }>()("@effect/ai-codegen/Glob") {}`
- **Import guidance:** Start from `import { Glob } from "@effect/ai-docgen/Glob"` and use `Glob`.
- **Suggested snippet:** Consume `Glob` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
