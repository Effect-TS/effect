# Example Suggestions: `@effect/sql-pg/PgClient`

- **Package:** `@effect/sql-pg`
- **Source:** `packages/sql/pg/src/PgClient.ts`
- **Uncovered API records:** 16
- **Priorities:** 0 required, 9 recommended, 5 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/sql-pg/PgClient.make`             |  149 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.makeClient`       |  215 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.fromPool`         |  274 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.fromClient`       |  478 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.makeWith`         |  559 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.layerFrom`        |  778 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.layerConfig`      |  794 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.layer`            |  810 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.PgClient (value)` |   97 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgClient.PgClientConfig`   |  105 | `root-declaration` | **optional**    |
| `@effect/sql-pg/PgClient.PgPoolConfig`     |  135 | `root-declaration` | **optional**    |
| `@effect/sql-pg/PgClient.makeCompiler`     |  820 | `root-declaration` | **optional**    |
| `@effect/sql-pg/PgClient.PgCustom`         |  871 | `root-declaration` | **optional**    |
| `@effect/sql-pg/PgClient.PgClient (type)`  |   79 | `root-declaration` | **optional**    |
| `@effect/sql-pg/PgClient.TypeId (value)`   |   63 | `root-declaration` | **discouraged** |
| `@effect/sql-pg/PgClient.TypeId (type)`    |   71 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-pg/PgClient.make`

- **Source:** `packages/sql/pg/src/PgClient.ts:149`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped PostgreSQL client backed by a managed `pg` connection pool.
- **Signature hint:** `declare function make(options: PgPoolConfig): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.makeClient`

- **Source:** `packages/sql/pg/src/PgClient.ts:215`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped PostgreSQL client backed by a managed single `pg` client, optionally acquiring a separate client for streaming and LISTEN operations.
- **Signature hint:** `declare function makeClient(options: PgClientConfig & { readonly acquireForStream?: boolean | undefined; }): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.makeClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgClient.makeClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.fromPool`

- **Source:** `packages/sql/pg/src/PgClient.ts:274`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a PostgreSQL client from a scoped `pg` pool acquisition effect, deriving transaction, streaming, and LISTEN/NOTIFY support from that pool.
- **Signature hint:** `declare function fromPool(options: { readonly acquire: Effect.Effect<Pg.Pool, SqlError, Scope.Scope>; readonly applicationName?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly transformResultNames?: ((str: string) => string) | undefined; readonly transformQueryNames?: ((str: string) => string) | undefined; readonly transformJson?: boolean | undefined; readonly types?: Pg.CustomTypesConfig | undefined; }): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.fromPool`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgClient.fromPool`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.fromClient`

- **Source:** `packages/sql/pg/src/PgClient.ts:478`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a PostgreSQL client from a scoped `pg` client acquisition effect, serializing access when sharing the client and optionally using separate clients for streams and LISTEN.
- **Signature hint:** `declare function fromClient(options: { readonly acquire: Effect.Effect<Pg.Client, SqlError, Scope.Scope>; readonly acquireForStream: boolean; readonly applicationName?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly transformResultNames?: ((str: string) => string) | undefined; readonly transformQueryNames?: ((str: string) => string) | undefined; readonly transformJson?: boolean | undefined; readonly types?: Pg.CustomTypesConfig | undefined; }): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.fromClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgClient.fromClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.makeWith`

- **Source:** `packages/sql/pg/src/PgClient.ts:559`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PgClient` from SQL connection acquirers, a LISTEN acquirer, client configuration, and transformation options.
- **Signature hint:** `declare function makeWith(options: { readonly acquirer: SqlConnection.Acquirer; readonly transactionAcquirer: SqlConnection.Acquirer; readonly listenAcquirer: Effect.Effect<Pg.ClientBase, SqlError, Scope.Scope>; readonly config: PgClientConfig; readonly spanAttributes?: Record<string, unknown> | undefined; readonly transformResultNames?: ((str: string) => string) | undefined; readonly transformQueryNames?: ((str: string) => string) | undefined; readonly transformJson?: boolean | undefined; }): Effect.Effect<PgClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.makeWith`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgClient.makeWith`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.layerFrom`

- **Source:** `packages/sql/pg/src/PgClient.ts:778`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from an effect that acquires a `PgClient`, providing both `PgClient` and `SqlClient`.
- **Signature hint:** `declare function layerFrom<E, R>(acquire: Effect.Effect<PgClient, E, R>): Layer.Layer<PgClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.layerFrom`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgClient.layerFrom`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.layerConfig`

- **Source:** `packages/sql/pg/src/PgClient.ts:794`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped PostgreSQL pool configuration, providing both `PgClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<PgPoolConfig>): Layer.Layer<PgClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.layer`

- **Source:** `packages/sql/pg/src/PgClient.ts:810`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete PostgreSQL pool configuration, providing both `PgClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config: PgPoolConfig): Layer.Layer<PgClient | Client.SqlClient, SqlError>`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgClient.PgClient (value)`

- **Source:** `packages/sql/pg/src/PgClient.ts:97`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the PostgreSQL client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.PgClient`.
- **Suggested snippet:** Consume `PgClient.PgClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-pg/PgClient.PgClientConfig`

- **Source:** `packages/sql/pg/src/PgClient.ts:105`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Configuration for a PostgreSQL client, including connection, TLS, custom stream, application name, type parser, JSON transform, and query/result name transform options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pg/PgClient.PgClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pg/PgClient.PgPoolConfig`

- **Source:** `packages/sql/pg/src/PgClient.ts:135`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** PostgreSQL pool configuration, extending `PgClientConfig` with idle timeout, pool size, and connection lifetime settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pg/PgClient.PgPoolConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pg/PgClient.makeCompiler`

- **Source:** `packages/sql/pg/src/PgClient.ts:820`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates the PostgreSQL statement compiler, using `$1` placeholders, double-quoted identifiers, PostgreSQL returning clauses, and optional JSON value transformation.
- **Signature hint:** `declare function makeCompiler(transform?: (_: string) => string, transformJson?: boolean): Statement.Compiler`
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `PgClient.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pg/PgClient.PgCustom`

- **Source:** `packages/sql/pg/src/PgClient.ts:871`
- **Kind / category:** `root-declaration` / `custom types`
- **Priority:** **optional**
- **Current description:** PostgreSQL-specific custom statement fragments supported by the compiler, currently JSON parameter fragments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pg/PgClient.PgCustom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pg/PgClient.PgClient (type)`

- **Source:** `packages/sql/pg/src/PgClient.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** PostgreSQL client service, extending `SqlClient` with JSON parameter fragments and LISTEN/NOTIFY helpers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pg/PgClient.PgClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-pg/PgClient.TypeId (value)`

- **Source:** `packages/sql/pg/src/PgClient.ts:63`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark `PgClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PgClient } from "@effect/sql-pg"` and use `PgClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PgClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-pg/PgClient.TypeId (type)`

- **Source:** `packages/sql/pg/src/PgClient.ts:71`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `PgClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-pg/PgClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
