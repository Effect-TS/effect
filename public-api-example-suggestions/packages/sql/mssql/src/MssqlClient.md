# Example Suggestions: `@effect/sql-mssql/MssqlClient`

- **Package:** `@effect/sql-mssql`
- **Source:** `packages/sql/mssql/src/MssqlClient.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 5 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-mssql/MssqlClient.make`                          |  265 | `root-declaration` | **recommended** |
| `@effect/sql-mssql/MssqlClient.layerConfig`                   |  623 | `root-declaration` | **recommended** |
| `@effect/sql-mssql/MssqlClient.layer`                         |  645 | `root-declaration` | **recommended** |
| `@effect/sql-mssql/MssqlClient.MssqlClient (value)`           |  197 | `root-declaration` | **recommended** |
| `@effect/sql-mssql/MssqlClient.defaultParameterTypes`         |  713 | `root-declaration` | **recommended** |
| `@effect/sql-mssql/MssqlClient.makeCompiler`                  |  661 | `root-declaration` | **optional**    |
| `@effect/sql-mssql/MssqlClient.MssqlClient (type)`            |  166 | `root-declaration` | **optional**    |
| `@effect/sql-mssql/MssqlClient.MssqlClientConfig`             |  205 | `root-declaration` | **optional**    |
| `@effect/sql-mssql/MssqlClient.MssqlClientConfig.encrypt`     |  212 | `member`           | **optional**    |
| `@effect/sql-mssql/MssqlClient.MssqlClientConfig.trustServer` |  216 | `member`           | **optional**    |
| `@effect/sql-mssql/MssqlClient.TypeId (value)`                |  150 | `root-declaration` | **discouraged** |
| `@effect/sql-mssql/MssqlClient.TypeId (type)`                 |  158 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-mssql/MssqlClient.make`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:265`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped Microsoft SQL Server client backed by a connection pool, with transaction and stored procedure support. Streaming queries are not implemented.
- **Signature hint:** `declare function make(options: MssqlClientConfig): Effect.Effect<MssqlClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `MssqlClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/MssqlClient.layerConfig`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:623`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<MssqlClientConfig>): Layer.Layer<Client.SqlClient | MssqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MssqlClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/MssqlClient.layer`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:645`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete SQL Server client configuration, providing both `MssqlClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config: MssqlClientConfig): Layer.Layer<Client.SqlClient | MssqlClient, never | SqlError>`
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MssqlClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/MssqlClient.MssqlClient (value)`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:197`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Microsoft SQL Server client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.MssqlClient`.
- **Suggested snippet:** Consume `MssqlClient.MssqlClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-mssql/MssqlClient.defaultParameterTypes`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:713`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Default mapping from Effect SQL primitive value kinds to Tedious SQL Server parameter data types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.defaultParameterTypes`.
- **Suggested snippet:** Use `MssqlClient.defaultParameterTypes` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-mssql/MssqlClient.makeCompiler`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:661`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Creates the SQL Server statement compiler, using `@1`-style placeholders, bracket-escaped identifiers, and SQL Server `OUTPUT INSERTED` returning clauses.
- **Signature hint:** `declare function makeCompiler(transform?: (_: string) => string): Statement.Compiler`
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `MssqlClient.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/MssqlClient.MssqlClient (type)`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:166`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Microsoft SQL Server client service, extending `SqlClient` with typed parameter fragments and stored procedure calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/MssqlClient.MssqlClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/MssqlClient.MssqlClientConfig`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:205`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a Microsoft SQL Server client, including connection, authentication, pool, parameter type, span attribute, and query/result name transform options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-mssql/MssqlClient.MssqlClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/MssqlClient.MssqlClientConfig.encrypt`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:212`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to encrypt traffic between the client and server. Defaults to `true`. Setting this to `false` disables transport encryption and transmits credentials in cleartext.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-mssql/MssqlClient.MssqlClientConfig.encrypt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-mssql/MssqlClient.MssqlClientConfig.trustServer`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:216`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to trust the server certificate without validating it. Defaults to `false`. Setting this to `true` disables TLS certificate validation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-mssql/MssqlClient.MssqlClientConfig.trustServer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-mssql/MssqlClient.TypeId (value)`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:150`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark `MssqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MssqlClient } from "@effect/sql-mssql"` and use `MssqlClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `MssqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-mssql/MssqlClient.TypeId (type)`

- **Source:** `packages/sql/mssql/src/MssqlClient.ts:158`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `MssqlClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-mssql/MssqlClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
