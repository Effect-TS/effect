# Example Suggestions: `@effect/api-diff/Report`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Report.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority     |
| ---------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/api-diff/Report.renderMarkdownReport` |   55 | `unmodeled-export` | **optional** |

## Optional

### `@effect/api-diff/Report.renderMarkdownReport`

- **Source:** `packages/tools/api-diff/src/Report.ts:55`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export const renderMarkdownReport = (diff: ApiDiff): string => { const counts = new Map<string, number>() for (const change of diff.changes) { counts.set(change.classification, (counts.get(change.classification) ?? 0) + 1) } const authoritative = diff.changes.filter((change) => change.authoritative) const suggested = diff.changes.filter((change) => !change.authoritative) const moduleCounts = new Map<string, number>() for (const change of diff.changes) { const id = change.headApiId ?? change.base`
- **Import guidance:** Start from `import { renderMarkdownReport } from "@effect/api-diff/Report"` and use `renderMarkdownReport`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: No compliant JSDoc description is currently available. Call `renderMarkdownReport` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
