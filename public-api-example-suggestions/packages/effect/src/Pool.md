# Example Suggestions: `effect/Pool`

- **Package:** `effect`
- **Source:** `packages/effect/src/Pool.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 4 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority        |
| ------------------------------ | ---: | ------------------ | --------------- |
| `effect/Pool.make`             |  220 | `root-declaration` | **recommended** |
| `effect/Pool.makeWithStrategy` |  323 | `root-declaration` | **recommended** |
| `effect/Pool.get`              |  423 | `root-declaration` | **recommended** |
| `effect/Pool.invalidate`       |  511 | `root-declaration` | **recommended** |
| `effect/Pool.isPool`           |  190 | `root-declaration` | **optional**    |
| `effect/Pool.Pool`             |   50 | `root-declaration` | **optional**    |
| `effect/Pool.Config`           |   76 | `root-declaration` | **optional**    |
| `effect/Pool.State`            |  109 | `root-declaration` | **optional**    |
| `effect/Pool.PoolItem`         |  142 | `root-declaration` | **optional**    |
| `effect/Pool.Strategy`         |  169 | `root-declaration` | **optional**    |

## Recommended

### `effect/Pool.make`

- **Source:** `packages/effect/src/Pool.ts:220`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Makes a new pool of the specified fixed size.
- **Signature hint:** `declare function make<A, E, R>(options: { readonly acquire: Effect.Effect<A, E, R>; readonly size: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; }): Effect.Effect<Pool<A, E>, never, R | Scope.Scope>`
- **Import guidance:** Start from `import { Pool } from "effect"` and use `Pool.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Pool.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pool.makeWithStrategy`

- **Source:** `packages/effect/src/Pool.ts:323`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped pool using a custom resizing and reclamation strategy.
- **Signature hint:** `declare function makeWithStrategy<A, E, R>(options: { readonly acquire: Effect.Effect<A, E, R>; readonly min: number; readonly max: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; readonly strategy: Strategy<A, E>; }): Effect.Effect<Pool<A, E>, never, Scope.Scope | R>`
- **Import guidance:** Start from `import { Pool } from "effect"` and use `Pool.makeWithStrategy`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Pool.makeWithStrategy`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pool.get`

- **Source:** `packages/effect/src/Pool.ts:423`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Retrieves an item from the pool in a scoped effect.
- **Signature hint:** `declare function get<A, E>(self: Pool<A, E>): Effect.Effect<A, E, Scope.Scope>`
- **Import guidance:** Start from `import { Pool } from "effect"` and use `Pool.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Pool.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Pool.invalidate`

- **Source:** `packages/effect/src/Pool.ts:511`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Invalidates the specified item so the pool can remove it and reallocate the item, lazily if needed.
- **Signature hint:** `declare function invalidate<A>(item: A): <E>(self: Pool<A, E>) => Effect.Effect<void, never, Scope.Scope> declare function invalidate<A, E>(self: Pool<A, E>, item: A): Effect.Effect<void, never, Scope.Scope>`
- **Import guidance:** Start from `import { Pool } from "effect"` and use `Pool.invalidate`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Pool.invalidate`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Pool.isPool`

- **Source:** `packages/effect/src/Pool.ts:190`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` if the specified value is a `Pool`, `false` otherwise.
- **Signature hint:** `declare function isPool(u: unknown): u is Pool<unknown, unknown>`
- **Import guidance:** Start from `import { Pool } from "effect"` and use `Pool.isPool`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Pool.isPool` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pool.Pool`

- **Source:** `packages/effect/src/Pool.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Pool<A, E>` is a pool of items of type `A`, each of which may be associated with the acquisition and release of resources. An attempt to get an item `A` from a pool may fail with an error of type `E`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pool.Pool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pool.Config`

- **Source:** `packages/effect/src/Pool.ts:76`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Normalized configuration used by a `Pool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pool.Config`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pool.State`

- **Source:** `packages/effect/src/Pool.ts:109`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Mutable runtime state maintained by a `Pool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pool.State`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pool.PoolItem`

- **Source:** `packages/effect/src/Pool.ts:142`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Internal record for a value managed by a `Pool`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pool.PoolItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pool.Strategy`

- **Source:** `packages/effect/src/Pool.ts:169`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Strategy used by a `Pool` to manage background resizing and item reclamation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pool.Strategy`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
