# Example Suggestions: `effect/MutableHashSet`

- **Package:** `effect`
- **Source:** `packages/effect/src/MutableHashSet.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority     |
| ---------------------------------------- | ---: | ------------------ | ------------ |
| `effect/MutableHashSet.isMutableHashSet` |   90 | `root-declaration` | **optional** |

## Optional

### `effect/MutableHashSet.isMutableHashSet`

- **Source:** `packages/effect/src/MutableHashSet.ts:90`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Checks whether the specified value is a `MutableHashSet`, `false` otherwise.
- **Signature hint:** `declare function isMutableHashSet<V>(value: unknown): value is MutableHashSet<V>`
- **Import guidance:** Start from `import { MutableHashSet } from "effect"` and use `MutableHashSet.isMutableHashSet`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `MutableHashSet.isMutableHashSet` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
