# Example Suggestions: `@effect/sql-libsql/LibsqlClient`

- **Package:** `@effect/sql-libsql`
- **Source:** `packages/sql/libsql/src/LibsqlClient.ts`
- **Uncovered API records:** 20
- **Priorities:** 0 required, 4 recommended, 14 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind                    | Priority        |
| ----------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `@effect/sql-libsql/LibsqlClient.make`                                  |  183 | `root-declaration`      | **recommended** |
| `@effect/sql-libsql/LibsqlClient.layerConfig`                           |  354 | `root-declaration`      | **recommended** |
| `@effect/sql-libsql/LibsqlClient.layer`                                 |  376 | `root-declaration`      | **recommended** |
| `@effect/sql-libsql/LibsqlClient.LibsqlClient (value)`                  |   70 | `root-declaration`      | **recommended** |
| `@effect/sql-libsql/LibsqlClient.LibsqlClient (type)`                   |   55 | `root-declaration`      | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type) (type)`      |   82 | `root-declaration`      | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type) (type)`      |   89 | `namespace`             | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Base`               |   96 | `namespace-declaration` | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full`               |  108 | `namespace-declaration` | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.url`           |  119 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.authToken`     |  121 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.encryptionKey` |  123 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncUrl`       |  125 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncInterval`  |  127 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.tls`           |  135 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.intMode`       |  148 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.concurrency`   |  157 | `member`                | **optional**    |
| `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Live`               |  166 | `namespace-declaration` | **optional**    |
| `@effect/sql-libsql/LibsqlClient.TypeId (value)`                        |   39 | `root-declaration`      | **discouraged** |
| `@effect/sql-libsql/LibsqlClient.TypeId (type)`                         |   47 | `root-declaration`      | **discouraged** |

## Recommended

### `@effect/sql-libsql/LibsqlClient.make`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:183`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped libSQL SQL client with transaction support. When given connection options it creates and closes the SDK client; when given `liveClient`, the caller retains ownership.
- **Signature hint:** `declare function make(options: LibsqlClientConfig): Effect.Effect<LibsqlClient, never, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { LibsqlClient } from "@effect/sql-libsql"` and use `LibsqlClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `LibsqlClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-libsql/LibsqlClient.layerConfig`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:354`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped libSQL client configuration, providing both `LibsqlClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<LibsqlClientConfig>): Layer.Layer<LibsqlClient | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { LibsqlClient } from "@effect/sql-libsql"` and use `LibsqlClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `LibsqlClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-libsql/LibsqlClient.layer`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:376`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete libSQL client configuration, providing both `LibsqlClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config: LibsqlClientConfig): Layer.Layer<LibsqlClient | Client.SqlClient>`
- **Import guidance:** Start from `import { LibsqlClient } from "@effect/sql-libsql"` and use `LibsqlClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `LibsqlClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-libsql/LibsqlClient.LibsqlClient (value)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:70`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the libSQL client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { LibsqlClient } from "@effect/sql-libsql"` and use `LibsqlClient.LibsqlClient`.
- **Suggested snippet:** Consume `LibsqlClient.LibsqlClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-libsql/LibsqlClient.LibsqlClient (type)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:55`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** libSQL-backed SQL client service, extending `SqlClient` with its runtime type marker and client configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type) (type)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:82`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a libSQL client, either by supplying connection options or an existing live libSQL client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type) (type)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:89`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the configuration variants for `LibsqlClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Base`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:96`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Shared libSQL client options for span attributes and query/result name transformations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Base`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:108`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Connection-based libSQL configuration used to create a managed client, including URL, credentials, sync, integer mode, TLS, and concurrency options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.url`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:119`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The database URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.url` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.authToken`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:121`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Authentication token for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.authToken` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.encryptionKey`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:123`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encryption key for the database.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.encryptionKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncUrl`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:125`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** URL of a remote server to synchronize database with.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncInterval`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sync interval in seconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.syncInterval` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.tls`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:135`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Enables or disables TLS for `libsql:` URLs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.tls` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.intMode`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:148`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** How to convert SQLite integers to JavaScript values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.intMode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.concurrency`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:157`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Concurrency limit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Full.concurrency` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Live`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:166`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration that uses an existing libSQL client. The supplied `liveClient` is caller-owned and is not closed by the Effect client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-libsql/LibsqlClient.LibsqlClientConfig.Live`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-libsql/LibsqlClient.TypeId (value)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:39`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark `LibsqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { LibsqlClient } from "@effect/sql-libsql"` and use `LibsqlClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `LibsqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-libsql/LibsqlClient.TypeId (type)`

- **Source:** `packages/sql/libsql/src/LibsqlClient.ts:47`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `LibsqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-libsql/LibsqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
