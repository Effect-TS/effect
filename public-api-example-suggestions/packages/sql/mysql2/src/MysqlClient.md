# Example Suggestions: `@effect/sql-mysql2/MysqlClient`

- **Package:** `@effect/sql-mysql2`
- **Source:** `packages/sql/mysql2/src/MysqlClient.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 4 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind               | Priority        |
| ---------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-mysql2/MysqlClient.make`                                        |  217 | `root-declaration` | **recommended** |
| `@effect/sql-mysql2/MysqlClient.layerConfig`                                 |  425 | `root-declaration` | **recommended** |
| `@effect/sql-mysql2/MysqlClient.layer`                                       |  445 | `root-declaration` | **recommended** |
| `@effect/sql-mysql2/MysqlClient.MysqlClient (value)`                         |  174 | `root-declaration` | **recommended** |
| `@effect/sql-mysql2/MysqlClient.makeCompiler`                                |  461 | `root-declaration` | **optional**    |
| `@effect/sql-mysql2/MysqlClient.MysqlClient (type)`                          |  159 | `root-declaration` | **optional**    |
| `@effect/sql-mysql2/MysqlClient.MysqlClientConfig`                           |  182 | `root-declaration` | **optional**    |
| `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.url`                       |  186 | `member`           | **optional**    |
| `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.disablePreparedStatements` |  203 | `member`           | **optional**    |
| `@effect/sql-mysql2/MysqlClient.TypeId (value)`                              |  143 | `root-declaration` | **discouraged** |
| `@effect/sql-mysql2/MysqlClient.TypeId (type)`                               |  151 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-mysql2/MysqlClient.make`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:217`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped MySQL client backed by a managed mysql2 pool, verifying connectivity and supporting streaming queries through mysql2 query streams.
- **Signature hint:** `declare function make(options: MysqlClientConfig): Effect.Effect<MysqlClient, SqlError, Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `MysqlClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mysql2/MysqlClient.layerConfig`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:425`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped MySQL client configuration, providing both `MysqlClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<MysqlClientConfig>): Layer.Layer<MysqlClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MysqlClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mysql2/MysqlClient.layer`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:445`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete MySQL client configuration, providing both `MysqlClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config: MysqlClientConfig): Layer.Layer<MysqlClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MysqlClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mysql2/MysqlClient.MysqlClient (value)`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:174`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the mysql2 SQL client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.MysqlClient`.
- **Suggested snippet:** Consume `MysqlClient.MysqlClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-mysql2/MysqlClient.makeCompiler`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:461`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Creates the MySQL statement compiler, using `?` placeholders and backtick-escaped identifiers.
- **Signature hint:** `declare function makeCompiler(transform?: (_: string) => string): Statement.Compiler`
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `MysqlClient.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mysql2/MysqlClient.MysqlClient (type)`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:159`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** mysql2-backed SQL client service, extending `SqlClient` with its runtime type marker and client configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mysql2/MysqlClient.MysqlClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mysql2/MysqlClient.MysqlClientConfig`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:182`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a mysql2 client, including connection URI or connection fields, pool options, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mysql2/MysqlClient.MysqlClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.url`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:186`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Connection URI. Setting this will override the other connection options
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.url` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.disablePreparedStatements`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:203`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Use the text protocol instead of prepared statements, for proxies like Cloudflare Hyperdrive that do not support `COM_STMT_PREPARE`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-mysql2/MysqlClient.MysqlClientConfig.disablePreparedStatements` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-mysql2/MysqlClient.TypeId (value)`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:143`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark `MysqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MysqlClient } from "@effect/sql-mysql2"` and use `MysqlClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `MysqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-mysql2/MysqlClient.TypeId (type)`

- **Source:** `packages/sql/mysql2/src/MysqlClient.ts:151`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `MysqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-mysql2/MysqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
