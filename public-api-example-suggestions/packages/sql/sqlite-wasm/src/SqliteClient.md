# Example Suggestions: `@effect/sql-sqlite-wasm/SqliteClient`

- **Package:** `@effect/sql-sqlite-wasm`
- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 8 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind               | Priority        |
| ---------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-wasm/SqliteClient.makeMemory`                |  132 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.make`                      |  300 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.layerMemoryConfig`         |  494 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.layerMemory`               |  514 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.layer`                     |  530 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.layerConfig`               |  546 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient (value)`      |   82 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.withTransferables`         |  484 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/SqliteClient.Transferables`             |  473 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient (type)`       |   66 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient.updateValues` |   73 | `member`           | **optional**    |
| `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientMemoryConfig`  |   90 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientConfig`        |  103 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-wasm/SqliteClient.TypeId (value)`            |   50 | `root-declaration` | **discouraged** |
| `@effect/sql-sqlite-wasm/SqliteClient.TypeId (type)`             |   58 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-sqlite-wasm/SqliteClient.makeMemory`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:132`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped in-memory SQLite WASM client using the memory VFS, serializing access through a semaphore and exposing database `export` and `import` operations.
- **Signature hint:** `declare function makeMemory(options: SqliteClientMemoryConfig): Effect.Effect<SqliteClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.makeMemory`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.makeMemory`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.make`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:300`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped worker-backed SQLite WASM client, communicating with the configured worker or message port, restarting the scoped connection on worker errors, and exposing database `export` and `import` operations.
- **Signature hint:** `declare function make(options: SqliteClientConfig): Effect.Effect<SqliteClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.layerMemoryConfig`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:494`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from an Effect `Config` value, providing both the in-memory SQLite WASM `SqliteClient` service and the generic `SqlClient` service.
- **Signature hint:** `declare function layerMemoryConfig(config: Config.Wrap<SqliteClientMemoryConfig>): Layer.Layer<SqliteClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.layerMemoryConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerMemoryConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.layerMemory`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:514`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from an in-memory SQLite WASM client configuration, providing both `SqliteClient` and the generic `SqlClient` service.
- **Signature hint:** `declare function layerMemory(config: SqliteClientMemoryConfig): Layer.Layer<SqliteClient | Client.SqlClient, SqlError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.layer`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:530`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from a worker-backed SQLite WASM client configuration, providing both `SqliteClient` and the generic `SqlClient` service.
- **Signature hint:** `declare function layer(config: SqliteClientConfig): Layer.Layer<SqliteClient | Client.SqlClient, SqlError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.layerConfig`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:546`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from an Effect `Config` value, providing both the worker-backed SQLite WASM `SqliteClient` service and the generic `SqlClient` service.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<SqliteClientConfig>): Layer.Layer<SqliteClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient (value)`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:82`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the SQLite WASM client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.SqliteClient`.
- **Suggested snippet:** Consume `SqliteClient.SqliteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-wasm/SqliteClient.withTransferables`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:484`
- **Kind / category:** `root-declaration` / `transferables`
- **Priority:** **recommended**
- **Current description:** Runs an effect with the supplied transferables attached to worker-backed SQLite WASM query messages.
- **Signature hint:** `declare function withTransferables(transferables: ReadonlyArray<Transferable>): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.withTransferables`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.withTransferables`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-sqlite-wasm/SqliteClient.Transferables`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:473`
- **Kind / category:** `root-declaration` / `transferables`
- **Priority:** **optional**
- **Current description:** Fiber reference that stores transferables to include with worker-backed SQLite WASM query messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.Transferables`.
- **Suggested snippet:** Consume `SqliteClient.Transferables` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient (type)`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** SQLite WASM client service interface, extending `SqlClient` with database `export` and `import` operations and marking `updateValues` as unsupported for SQLite.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient.updateValues`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Not supported in sqlite
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-sqlite-wasm/SqliteClient.SqliteClient.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientMemoryConfig`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for an in-memory SQLite WASM client, including optional reactivity hooks, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientMemoryConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientConfig`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:103`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a worker-backed SQLite WASM client, including the scoped worker or message port, optional reactivity hooks, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-wasm/SqliteClient.SqliteClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-sqlite-wasm/SqliteClient.TypeId (value)`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:50`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to SQLite WASM client values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-wasm"` and use `SqliteClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-sqlite-wasm/SqliteClient.TypeId (type)`

- **Source:** `packages/sql/sqlite-wasm/src/SqliteClient.ts:58`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier for SQLite WASM client values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-sqlite-wasm/SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
