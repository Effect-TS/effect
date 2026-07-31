# Example Suggestions: `effect/Cache`

- **Package:** `effect`
- **Source:** `packages/effect/src/Cache.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                       | Line | Kind               | Priority        |
| ------------------------- | ---: | ------------------ | --------------- |
| `effect/Cache.getSuccess` |  648 | `root-declaration` | **recommended** |
| `effect/Cache.entries`    | 1375 | `root-declaration` | **recommended** |
| `effect/Cache.Entry`      |  138 | `root-declaration` | **optional**    |

## Recommended

### `effect/Cache.getSuccess`

- **Source:** `packages/effect/src/Cache.ts:648`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves the value associated with the specified key from the cache, only if it contains a resolved successful value.
- **Signature hint:** `declare function getSuccess<Key, A, R>(key: Key): <E>(self: Cache<Key, A, E, R>) => Effect.Effect<Option.Option<A>> declare function getSuccess<Key, A, E, R>(self: Cache<Key, A, E, R>, key: Key): Effect.Effect<Option.Option<A>>`
- **Import guidance:** Start from `import { Cache } from "effect"` and use `Cache.getSuccess`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Cache.getSuccess`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Cache.entries`

- **Source:** `packages/effect/src/Cache.ts:1375`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Retrieves all key-value pairs from the cache as an iterable. This function only returns entries with successfully resolved values, filtering out any failed lookups or expired entries.
- **Signature hint:** `declare function entries<Key, A, E, R>(self: Cache<Key, A, E, R>): Effect.Effect<Iterable<[Key, A]>>`
- **Import guidance:** Start from `import { Cache } from "effect"` and use `Cache.entries`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Cache.entries`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Cache.Entry`

- **Source:** `packages/effect/src/Cache.ts:138`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a low-level cache entry containing a deferred lookup result and an optional expiration timestamp.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Cache.Entry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
