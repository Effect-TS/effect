# Example Suggestions: `effect/unstable/persistence/PersistedQueue`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 9 recommended, 5 optional, 5 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind               | Priority        |
| ---------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/persistence/PersistedQueue.makeStoreRedis`                  |  363 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.layerStoreRedis`                 |  726 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.makeStoreSql`                    |  751 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.layerStoreSql`                   | 1187 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.PersistedQueueFactory`           |  104 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.make`                            |  121 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.layer`                           |  192 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.PersistedQueueError`             |  220 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.PersistedQueueStore`             |  251 | `root-declaration` | **recommended** |
| `effect/unstable/persistence/PersistedQueue.makeFactory`                     |  142 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/PersistedQueue.layerStoreMemory`                |  289 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/PersistedQueue.PersistedQueue`                  |   62 | `root-declaration` | **optional**    |
| `effect/unstable/persistence/PersistedQueue.PersistedQueue.offer`            |   73 | `member`           | **optional**    |
| `effect/unstable/persistence/PersistedQueue.PersistedQueue.take`             |   87 | `member`           | **optional**    |
| `effect/unstable/persistence/PersistedQueue.TypeId (value)`                  |   40 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/PersistedQueue.TypeId (type)`                   |   48 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/PersistedQueue.ErrorTypeId (value)`             |  204 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/PersistedQueue.ErrorTypeId (type)`              |  212 | `root-declaration` | **discouraged** |
| `effect/unstable/persistence/PersistedQueue.PersistedQueueError.ErrorTypeId` |  232 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/persistence/PersistedQueue.makeStoreRedis`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:363`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Creates a Redis-backed `PersistedQueueStore`.
- **Signature hint:** `declare function makeStoreRedis(options?: { readonly prefix?: string | undefined; readonly pollInterval?: Duration.Input | undefined; readonly lockRefreshInterval?: Duration.Input | undefined; readonly lockExpiration?: Duration.Input | undefined; } | undefined): Effect.Effect<{ readonly offer: (options: { readonly name: string; readonly id: string; readonly element: unknown; readonly isCustomId: boolean; }) => Effect.Effect<void, PersistedQueueError>; readonly take: (options: { readonly name: string; readonly maxAttempts: number; }) => Effect.Effect<{ readonly id: string; readonly attempts: number; readonly element: unknown; }, PersistedQueueError, Scope.Scope>; }, never, Scope.Scope | Redis.Redis>`
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.makeStoreRedis`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PersistedQueue.makeStoreRedis`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.layerStoreRedis`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:726`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Provides a Redis-backed `PersistedQueueStore` using `makeStoreRedis`.
- **Signature hint:** `declare function layerStoreRedis(options?: { readonly prefix?: string | undefined; readonly pollInterval?: Duration.Input | undefined; readonly lockRefreshInterval?: Duration.Input | undefined; readonly lockExpiration?: Duration.Input | undefined; } | undefined): Layer.Layer<PersistedQueueStore, never, Redis.Redis>`
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.layerStoreRedis`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PersistedQueue.layerStoreRedis`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.makeStoreSql`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:751`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Creates a SQL-backed `PersistedQueueStore`.
- **Signature hint:** `declare function makeStoreSql(options?: { readonly tableName?: string | undefined; readonly pollInterval?: Duration.Input | undefined; readonly lockRefreshInterval?: Duration.Input | undefined; readonly lockExpiration?: Duration.Input | undefined; } | undefined): Effect.Effect<PersistedQueueStore['Service'], SqlError, SqlClient.SqlClient | Scope.Scope>`
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.makeStoreSql`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PersistedQueue.makeStoreSql`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.layerStoreSql`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:1187`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Provides a SQL-backed `PersistedQueueStore` using `makeStoreSql`.
- **Signature hint:** `declare function layerStoreSql(options?: { readonly tableName?: string | undefined; readonly pollInterval?: Duration.Input | undefined; readonly lockRefreshInterval?: Duration.Input | undefined; readonly lockExpiration?: Duration.Input | undefined; } | undefined): Layer.Layer<PersistedQueueStore, SqlError, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.layerStoreSql`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PersistedQueue.layerStoreSql`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.PersistedQueueFactory`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:104`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for constructing named `PersistedQueue` instances from schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.PersistedQueueFactory`.
- **Suggested snippet:** Consume `PersistedQueue.PersistedQueueFactory` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.make`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:121`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Accesses `PersistedQueueFactory` to create a named persisted queue for a schema.
- **Signature hint:** `declare function make<S extends Schema.Constraint>(options: { readonly name: string; readonly schema: S; }): Effect.Effect<PersistedQueue<S['Type'], S['EncodingServices'] | S['DecodingServices']>, never, PersistedQueueFactory>`
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PersistedQueue.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.layer`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:192`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `PersistedQueueFactory` using the current `PersistedQueueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PersistedQueue.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.PersistedQueueError`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:220`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by persisted queue store operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.PersistedQueueError`.
- **Suggested snippet:** Create or capture `PersistedQueue.PersistedQueueError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/persistence/PersistedQueue.PersistedQueueStore`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:251`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Defines the low-level backing store service used by `PersistedQueue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.PersistedQueueStore`.
- **Suggested snippet:** Consume `PersistedQueue.PersistedQueueStore` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/persistence/PersistedQueue.makeFactory`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:142`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `PersistedQueueFactory` from the current `PersistedQueueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.makeFactory`.
- **Suggested snippet:** Construct one representative value with `PersistedQueue.makeFactory`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/PersistedQueue.layerStoreMemory`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:289`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **optional**
- **Current description:** Provides an in-memory `PersistedQueueStore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.layerStoreMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PersistedQueue.layerStoreMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/PersistedQueue.PersistedQueue`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Persistent queue of schema-encoded values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/persistence/PersistedQueue.PersistedQueue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/PersistedQueue.PersistedQueue.offer`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adds an element to the queue and returns the id of the enqueued element.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/PersistedQueue.PersistedQueue.offer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/persistence/PersistedQueue.PersistedQueue.take`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:87`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Takes an element from the queue, waiting until one is available when the queue is empty.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/persistence/PersistedQueue.PersistedQueue.take` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/persistence/PersistedQueue.TypeId (value)`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:40`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `PersistedQueue` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PersistedQueue.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/PersistedQueue.TypeId (type)`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:48`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `PersistedQueue` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/PersistedQueue.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/PersistedQueue.ErrorTypeId (value)`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:204`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `PersistedQueueError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PersistedQueue } from "effect/unstable/persistence"` and use `PersistedQueue.ErrorTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PersistedQueue.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/PersistedQueue.ErrorTypeId (type)`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:212`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `PersistedQueueError` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/PersistedQueue.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/persistence/PersistedQueue.PersistedQueueError.ErrorTypeId`

- **Source:** `packages/effect/src/unstable/persistence/PersistedQueue.ts:232`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a persisted queue error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/persistence/PersistedQueue.PersistedQueueError.ErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
