# Example Suggestions: `@effect/sql-pglite/PgliteClient`

- **Package:** `@effect/sql-pglite`
- **Source:** `packages/sql/pglite/src/PgliteClient.ts`
- **Uncovered API records:** 17
- **Priorities:** 0 required, 6 recommended, 9 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind                    | Priority        |
| ------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `@effect/sql-pglite/PgliteClient.make`                             |  154 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.fromClient`                       |  182 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.layerFrom`                        |  348 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.layerConfig`                      |  364 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.layer`                            |  380 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.PgliteClient (value)`             |   87 | `root-declaration`      | **recommended** |
| `@effect/sql-pglite/PgliteClient.makeCompiler`                     |  390 | `root-declaration`      | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgCustom`                         |  442 | `root-declaration`      | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClient (type)`              |   66 | `root-declaration`      | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type) (type)` |   95 | `root-declaration`      | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type) (type)` |  102 | `namespace`             | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Base`          |  109 | `namespace-declaration` | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Create`        |  122 | `namespace-declaration` | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Live`          |  130 | `namespace-declaration` | **optional**    |
| `@effect/sql-pglite/PgliteClient.PgliteClientConfig.ConfigBase`    |  140 | `namespace-declaration` | **optional**    |
| `@effect/sql-pglite/PgliteClient.TypeId (value)`                   |   50 | `root-declaration`      | **discouraged** |
| `@effect/sql-pglite/PgliteClient.TypeId (type)`                    |   58 | `root-declaration`      | **discouraged** |

## Recommended

### `@effect/sql-pglite/PgliteClient.make`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:154`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped PGlite SQL client. When no live client is supplied it creates and closes a PGlite instance; when `liveClient` is supplied, the caller retains ownership.
- **Signature hint:** `declare function make(options?: PgliteClientConfig): Effect.Effect<PgliteClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgliteClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pglite/PgliteClient.fromClient`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:182`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `PgliteClient` around an existing PGlite instance, adding SQL client operations, LISTEN/NOTIFY, dump helpers, and serialized access.
- **Signature hint:** `declare function fromClient(options: PgliteClientConfig.Base & { readonly liveClient: PGliteInterface; }): Effect.Effect<PgliteClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.fromClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgliteClient.fromClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pglite/PgliteClient.layerFrom`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:348`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from an effect that acquires a `PgliteClient`, providing both `PgliteClient` and `SqlClient`.
- **Signature hint:** `declare function layerFrom<E, R>(acquire: Effect.Effect<PgliteClient, E, R>): Layer.Layer<PgliteClient | Client.SqlClient, E, Exclude<R, Scope.Scope | Reactivity.Reactivity>>`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.layerFrom`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgliteClient.layerFrom`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pglite/PgliteClient.layerConfig`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:364`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped PGlite client configuration, providing both `PgliteClient` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<PgliteClientConfig.ConfigBase>): Layer.Layer<PgliteClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgliteClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pglite/PgliteClient.layer`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:380`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete PGlite client configuration, providing both `PgliteClient` and `SqlClient`.
- **Signature hint:** `declare function layer(config?: PgliteClientConfig | undefined): Layer.Layer<PgliteClient | Client.SqlClient, SqlError>`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `PgliteClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pglite/PgliteClient.PgliteClient (value)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:87`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the PGlite client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.PgliteClient`.
- **Suggested snippet:** Consume `PgliteClient.PgliteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-pglite/PgliteClient.makeCompiler`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:390`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates the PGlite statement compiler, using PostgreSQL `$1` placeholders, double-quoted identifiers, returning clauses, and optional JSON value transformation.
- **Signature hint:** `declare function makeCompiler(transform?: (_: string) => string, transformJson?: boolean): Statement.Compiler`
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `PgliteClient.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgCustom`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:442`
- **Kind / category:** `root-declaration` / `custom types`
- **Priority:** **optional**
- **Current description:** PGlite-specific custom statement fragments supported by the compiler, currently JSON parameter fragments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgCustom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClient (type)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** PGlite-backed PostgreSQL client service, extending `SqlClient` with access to the PGlite instance, JSON fragments, LISTEN/NOTIFY, data directory dumps, and array type refresh.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type) (type)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:95`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a PGlite client, either by supplying PGlite creation options or an existing live PGlite client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type) (type)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:102`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the configuration variants for `PgliteClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Base`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:109`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Shared PGlite client options for span attributes, query/result name transformations, and JSON value transformation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Base`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Create`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:122`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration used to create a managed PGlite instance from PGlite constructor options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Create`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Live`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:130`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration that uses an existing PGlite client. The supplied `liveClient` is caller-owned and is not closed by the Effect client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig.Live`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-pglite/PgliteClient.PgliteClientConfig.ConfigBase`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:140`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Config-friendly subset of PGlite creation options, including data directory, username, database, relaxed durability, and shared transform options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-pglite/PgliteClient.PgliteClientConfig.ConfigBase`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-pglite/PgliteClient.TypeId (value)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:50`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark `PgliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PgliteClient } from "@effect/sql-pglite"` and use `PgliteClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PgliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-pglite/PgliteClient.TypeId (type)`

- **Source:** `packages/sql/pglite/src/PgliteClient.ts:58`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to mark `PgliteClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-pglite/PgliteClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
