# Example Suggestions: `@effect/sql-sqlite-do/SqliteClient`

- **Package:** `@effect/sql-sqlite-do`
- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 4 recommended, 3 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-do/SqliteClient.make`                      |  177 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-do/SqliteClient.layerConfig`               |  314 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-do/SqliteClient.layer`                     |  334 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-do/SqliteClient.SqliteClient (value)`      |   87 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-do/SqliteClient.SqliteClient (type)`       |   68 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-do/SqliteClient.SqliteClient.updateValues` |   73 | `member`           | **optional**    |
| `@effect/sql-sqlite-do/SqliteClient.SqliteClientConfig`        |   99 | `root-declaration` | **optional**    |
| `@effect/sql-sqlite-do/SqliteClient.TypeId (value)`            |   52 | `root-declaration` | **discouraged** |
| `@effect/sql-sqlite-do/SqliteClient.TypeId (type)`             |   60 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-sqlite-do/SqliteClient.make`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:177`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped Cloudflare Durable Object SQLite client around Durable Object SQLite storage, serializing access and converting returned `ArrayBuffer` values to `Uint8Array`.
- **Signature hint:** `declare function make(options: SqliteClientConfig): Effect.Effect<SqliteClient, never, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-do"` and use `SqliteClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-do/SqliteClient.layerConfig`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:314`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped Durable Object SQLite client configuration, providing both `SqliteClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<SqliteClientConfig>): Layer.Layer<SqliteClient | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-do"` and use `SqliteClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-do/SqliteClient.layer`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:334`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete Durable Object SQLite client configuration, providing both `SqliteClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config: SqliteClientConfig): Layer.Layer<SqliteClient | Client.SqlClient>`
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-do"` and use `SqliteClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqliteClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-do/SqliteClient.SqliteClient (value)`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:87`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Cloudflare Durable Object SQLite client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-do"` and use `SqliteClient.SqliteClient`.
- **Suggested snippet:** Consume `SqliteClient.SqliteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-sqlite-do/SqliteClient.SqliteClient (type)`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Cloudflare Durable Object SQLite client service, extending `SqlClient` with its configuration. `updateValues` is not supported.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-do/SqliteClient.SqliteClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-do/SqliteClient.SqliteClient.updateValues`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:73`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Not supported in sqlite
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-sqlite-do/SqliteClient.SqliteClient.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-sqlite-do/SqliteClient.SqliteClientConfig`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:99`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a Cloudflare Durable Object SQLite client, including either a `SqlStorage` handle or the full `DurableObjectStorage` for transaction support, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-do/SqliteClient.SqliteClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-sqlite-do/SqliteClient.TypeId (value)`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:52`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark Cloudflare Durable Object `SqliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqliteClient } from "@effect/sql-sqlite-do"` and use `SqliteClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-sqlite-do/SqliteClient.TypeId (type)`

- **Source:** `packages/sql/sqlite-do/src/SqliteClient.ts:60`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark Cloudflare Durable Object `SqliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-sqlite-do/SqliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
