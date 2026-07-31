# Example Suggestions: `@effect/api-diff/Diff`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Diff.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind               | Priority     |
| ------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/api-diff/Diff.diffSnapshots` |  399 | `unmodeled-export` | **optional** |

## Optional

### `@effect/api-diff/Diff.diffSnapshots`

- **Source:** `packages/tools/api-diff/src/Diff.ts:399`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const diffSnapshots = (base: ApiSnapshot, head: ApiSnapshot): ApiDiff => { const unmatchedBase = new Map(base.entities.map((entity) => [entity.id, entity])) const unmatchedHead = new Map(head.entities.map((entity) => [entity.id, entity])) const matches: Array<Match> = [] const suggestedMatches: Array<Match> = [] const addMatch = ( baseEntity: ApiEntity | undefined, headEntity: ApiEntity | undefined, details: Omit<Match, "base" | "head"> ): boolean => { if ( baseEntity === undefined || hea`
- **Import guidance:** Start from `import { diffSnapshots } from "@effect/api-diff/Diff"` and use `diffSnapshots`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `diffSnapshots` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
