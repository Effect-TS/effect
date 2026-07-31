# Example Suggestions: `effect/Function`

- **Package:** `effect`
- **Source:** `packages/effect/src/Function.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                       | Line | Kind               | Priority     |
| ------------------------- | ---: | ------------------ | ------------ |
| `effect/Function.memoize` | 1338 | `root-declaration` | **optional** |
| `effect/Function.cast`    |  294 | `root-declaration` | **optional** |

## Optional

### `effect/Function.memoize`

- **Source:** `packages/effect/src/Function.ts:1338`
- **Kind / category:** `root-declaration` / `caching`
- **Priority:** **optional**
- **Current description:** Creates a memoized function whose input is an object, caching results by object identity.
- **Signature hint:** `declare function memoize<A extends object, O>(f: (a: A) => O): (ast: A) => O`
- **Import guidance:** Start from `import { Function } from "effect"` and use `Function.memoize`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a memoized function whose input is an object, caching results by object identity. Call `Function.memoize` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Function.cast`

- **Source:** `packages/effect/src/Function.ts:294`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Returns the input value with a different static type.
- **Signature hint:** `declare function cast<A, B>(a: A): B`
- **Import guidance:** Start from `import { cast } from "effect"` and use `cast`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `cast`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
