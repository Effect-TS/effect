# Example Suggestions: `@effect/sql-sqlite-react-native/SqliteClient`

- **Package:** `@effect/sql-sqlite-react-native`
- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 5 recommended, 4 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-react-native/SqliteClient.make`                      |  121 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-react-native/SqliteClient.layerConfig`               |  233 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-react-native/SqliteClient.layer`                     |  253 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient (value)`      |   71 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-react-native/SqliteClient.withAsyncQuery`            |  110 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-react-native/SqliteClient.AsyncQuery`                |   99 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient (type)`       |   57 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient.updateValues` |   62 | `member`           | **optional**    |
| `@effect/sql-sqlite-react-native/SqliteClient.SqliteClientConfig`        |   79 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-react-native/SqliteClient.TypeId (value)`            |   41 | `root-declaration` | **discouraged** |
| `@effect/sql-sqlite-react-native/SqliteClient.TypeId (type)`             |   49 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-sqlite-react-native/SqliteClient.make`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:121`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped React Native SQLite client from the supplied configuration, using a single serialized connection and honoring `AsyncQuery` for query execution.
- **Signature hint:** `declare function make(options: SqliteClientConfig): Effect.Effect<SqliteClient, never, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-react-native/SqliteClient.layerConfig`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:233`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from an Effect `Config` value, providing both the React Native `SqliteClient` service and the generic `SqlClient` service.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<SqliteClientConfig>): Layer.Layer<SqliteClient | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-react-native/SqliteClient.layer`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:253`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a layer from a React Native SQLite client configuration, providing both `SqliteClient` and the generic `SqlClient` service.
- **Signature hint:** `declare function layer(config: SqliteClientConfig): Layer.Layer<SqliteClient | Client.SqlClient>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient (value)`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:71`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the React Native SQLite client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.SqliteClient`.
- **Suggested snippet:** Consume `SqliteClient.SqliteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-react-native/SqliteClient.withAsyncQuery`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:110`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **recommended**
- **Current description:** Runs an effect with `AsyncQuery` enabled, causing React Native SQLite queries in that effect to use the asynchronous driver API.
- **Signature hint:** `declare function withAsyncQuery<R, E, A>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, never>>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.withAsyncQuery`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.withAsyncQuery`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-sqlite-react-native/SqliteClient.AsyncQuery`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:99`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **optional**
- **Current description:** Fiber reference that makes the React Native SQLite client run queries through the asynchronous `execute` API instead of `executeSync`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.AsyncQuery`.
- **Suggested snippet:** Consume `SqliteClient.AsyncQuery` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient (type)`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** React Native SQLite client service interface, extending `SqlClient` with its configuration and marking `updateValues` as unsupported for SQLite.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient.updateValues`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Not supported in sqlite
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-sqlite-react-native/SqliteClient.SqliteClient.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-react-native/SqliteClient.SqliteClientConfig`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a React Native SQLite client, including the database filename, optional location and encryption key, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-react-native/SqliteClient.SqliteClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-sqlite-react-native/SqliteClient.TypeId (value)`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:41`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier attached to SQLite React Native client values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-react-native"` and use `SqliteClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-sqlite-react-native/SqliteClient.TypeId (type)`

- **Source:** `packages/sql/sqlite-react-native/src/SqliteClient.ts:49`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier for SQLite React Native client values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-sqlite-react-native/SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
