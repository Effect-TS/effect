# Example Suggestions: `@effect/sql-sqlite-node/SqliteClient`

- **Package:** `@effect/sql-sqlite-node`
- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 4 recommended, 4 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind               | Priority        |
| ---------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-node/SqliteClient.make`                      |  113 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-node/SqliteClient.layerConfig`               |  327 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-node/SqliteClient.layer`                     |  347 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-node/SqliteClient.SqliteClient (value)`      |   82 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-node/SqliteClient.SqliteClient (type)`       |   55 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-node/SqliteClient.SqliteClient.updateValues` |   62 | `member`           | **optional**    |
| `@effect/sql-sqlite-node/SqliteClient.BackupMetadata`            |   71 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-node/SqliteClient.SqliteClientConfig`        |   90 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-node/SqliteClient.TypeId (value)`            |   39 | `root-declaration` | **discouraged** |
| `@effect/sql-sqlite-node/SqliteClient.TypeId (type)`             |   47 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-sqlite-node/SqliteClient.make`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:113`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped node SQLite client from the supplied configuration, using a single serialized connection with WAL enabled by default and exposing SQLite-specific `export`, `backup`, and `loadExtension` operations.
- **Signature hint:** `declare function make(options: SqliteClientConfig): Effect.Effect<SqliteClient, never, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-node"` and use `SqliteClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-node/SqliteClient.layerConfig`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:327`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from an Effect `Config` value, providing both the node `SqliteClient` service and the generic `SqlClient` service.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<SqliteClientConfig>): Layer.Layer<SqliteClient | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-node"` and use `SqliteClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-node/SqliteClient.layer`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:347`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from a node SQLite client configuration, providing both `SqliteClient` and the generic `SqlClient` service.
- **Signature hint:** `declare function layer(config: SqliteClientConfig): Layer.Layer<SqliteClient | Client.SqlClient>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-node"` and use `SqliteClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-node/SqliteClient.SqliteClient (value)`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:82`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the node SQLite client implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-node"` and use `SqliteClient.SqliteClient`.
- **Suggested snippet:** Consume `SqliteClient.SqliteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-sqlite-node/SqliteClient.SqliteClient (type)`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:55`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Node SQLite client service, extending `SqlClient` with database export, backup, and extension loading helpers. `updateValues` is not supported.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-node/SqliteClient.SqliteClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-node/SqliteClient.SqliteClient.updateValues`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Not supported in sqlite
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-sqlite-node/SqliteClient.SqliteClient.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-node/SqliteClient.BackupMetadata`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata returned from a Node SQLite backup operation, reporting total and remaining page counts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-node/SqliteClient.BackupMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-node/SqliteClient.SqliteClientConfig`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a node SQLite client backed by `node:sqlite`, including the database filename, read-only mode, statement cache settings, WAL behavior, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-node/SqliteClient.SqliteClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-sqlite-node/SqliteClient.TypeId (value)`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:39`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark Node `SqliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-node"` and use `SqliteClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-sqlite-node/SqliteClient.TypeId (type)`

- **Source:** `packages/sql/sqlite-node/src/SqliteClient.ts:47`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark Node `SqliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-sqlite-node/SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
