# Example Suggestions: `effect/Record`

- **Package:** `effect`
- **Source:** `packages/effect/src/Record.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                     | Line | Kind               | Priority     |
| --------------------------------------- | ---: | ------------------ | ------------ |
| `effect/Record.makeReducerUnion`        | 1452 | `root-declaration` | **optional** |
| `effect/Record.makeReducerIntersection` | 1480 | `root-declaration` | **optional** |

## Optional

### `effect/Record.makeReducerUnion`

- **Source:** `packages/effect/src/Record.ts:1452`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **optional**
- **Current description:** Creates a `Reducer` for combining `Record`s using union, with values for keys that exist in both records combined using the provided `Combiner`.
- **Signature hint:** `declare function makeReducerUnion<K extends string, A>(combiner: Combiner.Combiner<A>): Reducer.Reducer<Record<K, A>>`
- **Import guidance:** Start from `import { Record } from "effect"` and use `Record.makeReducerUnion`.
- **Suggested snippet:** Obtain the reducer from `Record.makeReducerUnion`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Record.makeReducerIntersection`

- **Source:** `packages/effect/src/Record.ts:1480`
- **Kind / category:** `root-declaration` / `combining`
- **Priority:** **optional**
- **Current description:** Creates a `Reducer` whose `combine` operation intersects two records and combines values for keys present in both records.
- **Signature hint:** `declare function makeReducerIntersection<K extends string, A>(combiner: Combiner.Combiner<A>): Reducer.Reducer<Record<K, A>>`
- **Import guidance:** Start from `import { Record } from "effect"` and use `Record.makeReducerIntersection`.
- **Suggested snippet:** Obtain the reducer from `Record.makeReducerIntersection`, combine two or three small representative values with the public Reducer operation used by nearby tests, and assert the final value. Include the identity only when it distinguishes a sibling reducer.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
