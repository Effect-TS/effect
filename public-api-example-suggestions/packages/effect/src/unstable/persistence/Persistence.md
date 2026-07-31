# Example Suggestions: `effect/unstable/persistence/Persistence`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 4 recommended, 12 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                    | Line | Kind               | Priority        |
| ---------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/Persistence.PersistenceError`             |   38 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistence.BackingPersistence`           |  105 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistence.layer`                        |  144 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistence.layerRedis`                   | 1146 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/Persistence.BackingPersistenceStore`      |  116 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerBackingMemory`           |  244 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerBackingSqlMultiTable`    |  298 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerBackingSql`              |  513 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerBackingRedis`            |  867 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerBackingKvs`              | 1028 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerKvs`                     | 1126 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerMemory`                  | 1136 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerSqlMultiTable`           | 1156 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.layerSql`                     | 1166 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.Persistence`                  |   58 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.PersistenceStore`             |   71 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/Persistence.unsafeTtlToExpires`           | 1181 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/Persistence.PersistenceError.ErrorTypeId` |   48 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/persistence/Persistence.PersistenceError`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:38`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by persistence and backing-store operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.PersistenceError`.
- **Suggested snippet:** Create or capture `Persistence.PersistenceError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistence.BackingPersistence`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:105`
- **Kind / category:** `root-declaration` / `BackingPersistence`
- **Priority:** **recommended**
- **Current description:** Service for creating raw backing stores for persistence store ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.BackingPersistence`.
- **Suggested snippet:** Consume `Persistence.BackingPersistence` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistence.layer`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:144`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Persistence` from `BackingPersistence`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/Persistence.layerRedis`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1146`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Persistence` backed by the current `Redis` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerRedis`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerRedis`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/Persistence.BackingPersistenceStore`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:116`
- **Kind / category:** `root-declaration` / `BackingPersistence`
- **Priority:** **optional**
- **Current description:** Raw persistence backing store for JSON-compatible objects with optional TTLs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistence.BackingPersistenceStore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerBackingMemory`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:244`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides an in-memory `BackingPersistence` grouped by store id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerBackingMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerBackingMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerBackingSqlMultiTable`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:298`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides SQL-backed persistence using one table per store id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerBackingSqlMultiTable`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerBackingSqlMultiTable`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerBackingSql`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:513`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides SQL-backed persistence using a shared `effect_persistence` table.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerBackingSql`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerBackingSql`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerBackingRedis`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:867`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides Redis-backed persistence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerBackingRedis`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerBackingRedis`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerBackingKvs`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1028`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `BackingPersistence` using a `KeyValueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerBackingKvs`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerBackingKvs`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerKvs`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1126`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `Persistence` backed by the current `KeyValueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerKvs`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerKvs`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerMemory`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1136`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `Persistence` backed by process-local in-memory storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerSqlMultiTable`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1156`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `Persistence` backed by SQL with one table per store id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerSqlMultiTable`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerSqlMultiTable`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.layerSql`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1166`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `Persistence` backed by SQL using a shared persistence table.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.layerSql`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Persistence.layerSql`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.Persistence`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:58`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for creating scoped stores of persisted `Persistable` request results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.Persistence`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Persistence.Persistence`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/Persistence.PersistenceStore`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Typed store for persisted `Exit` values keyed by `Persistable` requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/Persistence.PersistenceStore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/Persistence.unsafeTtlToExpires`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:1181`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **discouraged**
- **Current description:** Converts a TTL to an absolute expiration timestamp in milliseconds.
- **Signature hint:** `declare function unsafeTtlToExpires(clock: Clock.Clock, ttl: Duration.Duration | undefined): number | null`
- **Import guidance:** Start from `import { Persistence } from "effect/unstable/persistence"` and use `Persistence.unsafeTtlToExpires`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Persistence.unsafeTtlToExpires` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/Persistence.PersistenceError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/persistence/Persistence.ts:48`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a persistence error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/Persistence.PersistenceError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
