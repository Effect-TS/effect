# Example Suggestions: `effect/MutableHashMap`

- **Package:** `effect`
- **Source:** `packages/effect/src/MutableHashMap.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `effect/MutableHashMap.isEmpty`          |  798 | `root-declaration` | **recommended** |
| `effect/MutableHashMap.isMutableHashMap` |   89 | `root-declaration` | **optional**    |
| `effect/MutableHashMap.forEach`          |  819 | `root-declaration` | **optional**    |

## Recommended

### `effect/MutableHashMap.isEmpty`

- **Source:** `packages/effect/src/MutableHashMap.ts:798`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the `MutableHashMap` contains no key-value pairs.
- **Signature hint:** `declare function isEmpty<K, V>(self: MutableHashMap<K, V>): boolean`
- **Import guidance:** Start from `import { MutableHashMap } from "effect"` and use `MutableHashMap.isEmpty`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `MutableHashMap.isEmpty`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/MutableHashMap.isMutableHashMap`

- **Source:** `packages/effect/src/MutableHashMap.ts:89`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Checks whether the specified value is a `MutableHashMap`, `false` otherwise.
- **Signature hint:** `declare function isMutableHashMap<K, V>(value: unknown): value is MutableHashMap<K, V>`
- **Import guidance:** Start from `import { MutableHashMap } from "effect"` and use `MutableHashMap.isMutableHashMap`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `MutableHashMap.isMutableHashMap` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/MutableHashMap.forEach`

- **Source:** `packages/effect/src/MutableHashMap.ts:819`
- **Kind / category:** `root-declaration` / `traversing`
- **Priority:** **optional**
- **Current description:** Runs a callback for each key-value pair in the `MutableHashMap`.
- **Signature hint:** `declare function forEach<K, V>(f: (value: V, key: K) => void): (self: MutableHashMap<K, V>) => void declare function forEach<K, V>(self: MutableHashMap<K, V>, f: (value: V, key: K) => void): void`
- **Import guidance:** Start from `import { MutableHashMap } from "effect"` and use `MutableHashMap.forEach`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Runs a callback for each key-value pair in the `MutableHashMap`. Call `MutableHashMap.forEach` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
