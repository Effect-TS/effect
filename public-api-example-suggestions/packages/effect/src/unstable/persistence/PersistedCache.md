# Example Suggestions: `effect/unstable/persistence/PersistedCache`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/PersistedCache.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/PersistedCache.make`           |   57 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedCache.PersistedCache` |   29 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/persistence/PersistedCache.make`

- **Source:** `packages/effect/src/unstable/persistence/PersistedCache.ts:57`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a persisted cache for `Persistable` request keys.
- **Signature hint:** `declare function make<K extends Persistable.Any, R = never, ServiceMode extends 'lookup' | 'construction' = never>(lookup: (key: K) => Effect.Effect<Persistable.Success<K>, Persistable.Error<K>, R>, options: { readonly storeId: string; readonly timeToLive: Persistable.TimeToLiveFn<K>; readonly inMemoryCapacity?: number | undefined; readonly inMemoryTTL?: Persistable.TimeToLiveFn<K> | undefined; readonly requireServicesAt?: ServiceMode | undefined; }): Effect.Effect<PersistedCache<K, 'lookup' extends ServiceMode ? R : never>, never, ('lookup' extends ServiceMode ? never : R) | Persistence.Persistence | Scope.Scope>`
- **Import guidance:** Start from `import { PersistedCache } from "effect/unstable/persistence"` and use `PersistedCache.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PersistedCache.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/PersistedCache.PersistedCache`

- **Source:** `packages/effect/src/unstable/persistence/PersistedCache.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Cache that combines an in-memory `Cache` with a persisted backing store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/PersistedCache.PersistedCache`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
