# Example Suggestions: `@effect/api-diff/Annotations`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Annotations.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Annotations.loadAnnotations`     |   65 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Annotations.MigrationAnnotation` |    7 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Annotations.loadAnnotations`

- **Source:** `packages/tools/api-diff/src/Annotations.ts:65`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const loadAnnotations = (directory: string) => loadAnnotationsInternal(directory).pipe( Effect.mapError((cause) => cause instanceof ApiDiffError ? cause : new ApiDiffError({ message: 'Could not load annotations from ${directory}', cause }) ) )`
- **Import guidance:** Start from `import { loadAnnotations } from "@effect/api-diff/Annotations"` and use `loadAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `loadAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Annotations.MigrationAnnotation`

- **Source:** `packages/tools/api-diff/src/Annotations.ts:7`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface MigrationAnnotation { readonly replacement: string readonly note: string readonly example?: string | undefined }`
- **Import guidance:** Start from `import { MigrationAnnotation } from "@effect/api-diff/Annotations"` and use `MigrationAnnotation`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `MigrationAnnotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
