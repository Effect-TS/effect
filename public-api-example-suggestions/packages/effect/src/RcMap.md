# Example Suggestions: `effect/RcMap`

- **Package:** `effect`
- **Source:** `packages/effect/src/RcMap.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 1 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind                    | Priority        |
| ---------------------------------- | ---: | ----------------------- | --------------- |
| `effect/RcMap.has`                 |  556 | `root-declaration`      | **recommended** |
| `effect/RcMap.State (type) (type)` |   98 | `root-declaration`      | **optional**    |
| `effect/RcMap.State (type) (type)` |  110 | `namespace`             | **optional**    |
| `effect/RcMap.State.Open`          |  123 | `namespace-declaration` | **optional**    |
| `effect/RcMap.State.Closed`        |  139 | `namespace-declaration` | **optional**    |
| `effect/RcMap.State.Entry`         |  155 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/RcMap.has`

- **Source:** `packages/effect/src/RcMap.ts:556`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns whether the `RcMap` currently contains an entry for the specified key.
- **Signature hint:** `declare function has<K>(key: K): <A, E>(self: RcMap<K, A, E>) => Effect.Effect<boolean> declare function has<K, A, E>(self: RcMap<K, A, E>, key: K): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { RcMap } from "effect"` and use `RcMap.has`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RcMap.has`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/RcMap.State (type) (type)`

- **Source:** `packages/effect/src/RcMap.ts:98`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the internal state of an RcMap, which can be either Open (active) or Closed (shutdown and no longer accepting operations).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RcMap.State (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RcMap.State (type) (type)`

- **Source:** `packages/effect/src/RcMap.ts:110`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the internal state types for RcMap.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RcMap.State (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RcMap.State.Open`

- **Source:** `packages/effect/src/RcMap.ts:123`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the open/active state of an RcMap, containing the actual resource map that stores entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RcMap.State.Open`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RcMap.State.Closed`

- **Source:** `packages/effect/src/RcMap.ts:139`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the closed state of an RcMap, indicating that the map has been shut down and will no longer accept new operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RcMap.State.Closed`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RcMap.State.Entry`

- **Source:** `packages/effect/src/RcMap.ts:155`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an individual entry in the RcMap, containing the resource's metadata including reference count, expiration time, and lifecycle management.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RcMap.State.Entry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
