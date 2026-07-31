# Example Suggestions: `effect/ScopedCache`

- **Package:** `effect`
- **Source:** `packages/effect/src/ScopedCache.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 15 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind               | Priority        |
| ----------------------------------- | ---: | ------------------ | --------------- |
| `effect/ScopedCache.makeWith`       |  132 | `root-declaration` | **recommended** |
| `effect/ScopedCache.make`           |  194 | `root-declaration` | **recommended** |
| `effect/ScopedCache.invalidate`     |  533 | `root-declaration` | **recommended** |
| `effect/ScopedCache.invalidateAll`  |  683 | `root-declaration` | **recommended** |
| `effect/ScopedCache.get`            |  254 | `root-declaration` | **recommended** |
| `effect/ScopedCache.getOption`      |  343 | `root-declaration` | **recommended** |
| `effect/ScopedCache.getSuccess`     |  405 | `root-declaration` | **recommended** |
| `effect/ScopedCache.set`            |  447 | `root-declaration` | **recommended** |
| `effect/ScopedCache.has`            |  499 | `root-declaration` | **recommended** |
| `effect/ScopedCache.invalidateWhen` |  574 | `root-declaration` | **recommended** |
| `effect/ScopedCache.refresh`        |  622 | `root-declaration` | **recommended** |
| `effect/ScopedCache.size`           |  719 | `root-declaration` | **recommended** |
| `effect/ScopedCache.keys`           |  739 | `root-declaration` | **recommended** |
| `effect/ScopedCache.values`         |  776 | `root-declaration` | **recommended** |
| `effect/ScopedCache.entries`        |  799 | `root-declaration` | **recommended** |
| `effect/ScopedCache.ScopedCache`    |   54 | `root-declaration` | **optional**    |
| `effect/ScopedCache.State`          |   78 | `root-declaration` | **optional**    |
| `effect/ScopedCache.Entry`          |  104 | `root-declaration` | **optional**    |

## Recommended

### `effect/ScopedCache.makeWith`

- **Source:** `packages/effect/src/ScopedCache.ts:132`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `ScopedCache` from a lookup function, maximum capacity, and a time-to-live function computed from each lookup exit and key.
- **Signature hint:** `declare function makeWith<Key, A, E = never, R = never, ServiceMode extends 'lookup' | 'construction' = never>(options: { readonly lookup: (key: Key) => Effect.Effect<A, E, R | Scope.Scope>; readonly capacity: number; readonly timeToLive?: ((exit: Exit.Exit<A, E>, key: Key) => Duration.Input) | undefined; readonly requireServicesAt?: ServiceMode | undefined; }): Effect.Effect<ScopedCache<Key, A, E, 'lookup' extends ServiceMode ? Exclude<R, Scope.Scope> : never>, never, ('lookup' extends ServiceMode ? never : R) | Scope.Scope>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.makeWith`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.makeWith`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.make`

- **Source:** `packages/effect/src/ScopedCache.ts:194`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `ScopedCache` with a fixed time-to-live for every lookup result.
- **Signature hint:** `declare function make<Key, A, E = never, R = never, ServiceMode extends 'lookup' | 'construction' = never>(options: { readonly lookup: (key: Key) => Effect.Effect<A, E, R | Scope.Scope>; readonly capacity: number; readonly timeToLive?: Duration.Input | undefined; readonly requireServicesAt?: ServiceMode | undefined; }): Effect.Effect<ScopedCache<Key, A, E, 'lookup' extends ServiceMode ? Exclude<R, Scope.Scope> : never>, never, ('lookup' extends ServiceMode ? never : R) | Scope.Scope>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.invalidate`

- **Source:** `packages/effect/src/ScopedCache.ts:533`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes the entry associated with a key and closes its entry scope.
- **Signature hint:** `declare function invalidate<Key, A>(key: Key): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<void> declare function invalidate<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<void>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.invalidate`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.invalidate`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.invalidateAll`

- **Source:** `packages/effect/src/ScopedCache.ts:683`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes every entry from the cache and closes each entry scope.
- **Signature hint:** `declare function invalidateAll<Key, A, E, R>(self: ScopedCache<Key, A, E, R>): Effect.Effect<void>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.invalidateAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.invalidateAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.get`

- **Source:** `packages/effect/src/ScopedCache.ts:254`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Gets the value for a key, running the cache lookup when no unexpired entry is present.
- **Signature hint:** `declare function get<Key, A>(key: Key): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<A, E, R> declare function get<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.getOption`

- **Source:** `packages/effect/src/ScopedCache.ts:343`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Reads an existing unexpired cache entry without running the lookup function.
- **Signature hint:** `declare function getOption<Key, A>(key: Key): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<Option.Option<A>, E> declare function getOption<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<Option.Option<A>, E>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.getOption`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.getOption`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.getSuccess`

- **Source:** `packages/effect/src/ScopedCache.ts:405`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves the value associated with the specified key from the cache, only if it contains a resolved successful value.
- **Signature hint:** `declare function getSuccess<Key, A, R>(key: Key): <E>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<Option.Option<A>> declare function getSuccess<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<Option.Option<A>>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.getSuccess`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.getSuccess`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.set`

- **Source:** `packages/effect/src/ScopedCache.ts:447`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a successful value for a key without running the lookup function.
- **Signature hint:** `declare function set<Key, A>(key: Key, value: A): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<void> declare function set<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key, value: A): Effect.Effect<void>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.set`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.set`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.has`

- **Source:** `packages/effect/src/ScopedCache.ts:499`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Checks whether the cache contains an entry for the specified key.
- **Signature hint:** `declare function has<Key, A>(key: Key): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<boolean> declare function has<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.has`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.has`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.invalidateWhen`

- **Source:** `packages/effect/src/ScopedCache.ts:574`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Invalidates the entry associated with the specified key in the cache when the predicate returns true for the cached value.
- **Signature hint:** `declare function invalidateWhen<Key, A>(key: Key, f: Predicate.Predicate<A>): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<boolean> declare function invalidateWhen<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key, f: Predicate.Predicate<A>): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.invalidateWhen`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.invalidateWhen`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.refresh`

- **Source:** `packages/effect/src/ScopedCache.ts:622`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Forces a refresh of the value associated with the specified key in the cache.
- **Signature hint:** `declare function refresh<Key, A>(key: Key): <E, R>(self: ScopedCache<Key, A, E, R>) => Effect.Effect<A, E, R> declare function refresh<Key, A, E, R>(self: ScopedCache<Key, A, E, R>, key: Key): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.refresh`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.refresh`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.size`

- **Source:** `packages/effect/src/ScopedCache.ts:719`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves the approximate number of entries in the cache.
- **Signature hint:** `declare function size<Key, A, E, R>(self: ScopedCache<Key, A, E, R>): Effect.Effect<number>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.size`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.size`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.keys`

- **Source:** `packages/effect/src/ScopedCache.ts:739`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves all active keys from the cache, automatically filtering out expired entries.
- **Signature hint:** `declare function keys<Key, A, E, R>(self: ScopedCache<Key, A, E, R>): Effect.Effect<Array<Key>>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.keys`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.keys`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.values`

- **Source:** `packages/effect/src/ScopedCache.ts:776`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves all successfully cached values from the cache, excluding failed lookups and expired entries.
- **Signature hint:** `declare function values<Key, A, E, R>(self: ScopedCache<Key, A, E, R>): Effect.Effect<Array<A>>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.values`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.values`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedCache.entries`

- **Source:** `packages/effect/src/ScopedCache.ts:799`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves all key-value pairs from the cache as an array. This function only returns entries with successfully resolved values, filtering out any failed lookups or expired entries.
- **Signature hint:** `declare function entries<Key, A, E, R>(self: ScopedCache<Key, A, E, R>): Effect.Effect<Array<[Key, A]>>`
- **Import guidance:** Start from `import { ScopedCache } from "effect"` and use `ScopedCache.entries`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedCache.entries`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/ScopedCache.ScopedCache`

- **Source:** `packages/effect/src/ScopedCache.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A scoped cache whose values are acquired by a lookup effect and stored in per-entry scopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ScopedCache.ScopedCache`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ScopedCache.State`

- **Source:** `packages/effect/src/ScopedCache.ts:78`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents whether a `ScopedCache` is open or closed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ScopedCache.State`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/ScopedCache.Entry`

- **Source:** `packages/effect/src/ScopedCache.ts:104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A single scoped cache entry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ScopedCache.Entry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
