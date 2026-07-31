# Example Suggestions: `@effect/sql-clickhouse/ClickhouseClient`

- **Package:** `@effect/sql-clickhouse`
- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 4 recommended, 7 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/sql-clickhouse/ClickhouseClient.make`                     |  169 | `root-declaration` | **recommended** |
| `@effect/sql-clickhouse/ClickhouseClient.layerConfig`              |  444 | `root-declaration` | **recommended** |
| `@effect/sql-clickhouse/ClickhouseClient.layer`                    |  467 | `root-declaration` | **recommended** |
| `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClient (value)` |  145 | `root-declaration` | **recommended** |
| `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClientConfig`   |  155 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.ClientMethod`             |  405 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.QueryId`                  |  419 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.ClickhouseSettings`       |  431 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.makeCompiler`             |  510 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.ClickhouseCustom`         |  540 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClient (type)`  |  110 | `root-declaration` | **optional**    |
| `@effect/sql-clickhouse/ClickhouseClient.TypeId (value)`           |   92 | `root-declaration` | **discouraged** |
| `@effect/sql-clickhouse/ClickhouseClient.TypeId (type)`            |  100 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-clickhouse/ClickhouseClient.make`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:169`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped `ClickhouseClient`, verifies connectivity with `SELECT 1`, closes the underlying client when the scope ends, maps ClickHouse failures to `SqlError`, and aborts plus kills in-flight queries when interrupted.
- **Signature hint:** `declare function make(options: ClickhouseClientConfig): Effect.Effect<ClickhouseClient, SqlError, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ClickhouseClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-clickhouse/ClickhouseClient.layerConfig`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:444`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides both `ClickhouseClient` and generic `SqlClient` services from a `Config`-backed ClickHouse client configuration.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<ClickhouseClientConfig>): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ClickhouseClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-clickhouse/ClickhouseClient.layer`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:467`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides both `ClickhouseClient` and generic `SqlClient` services from a ClickHouse client configuration.
- **Signature hint:** `declare function layer(config: ClickhouseClientConfig): Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError>`
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ClickhouseClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClient (value)`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:145`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the active ClickHouse SQL client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.ClickhouseClient`.
- **Suggested snippet:** Consume `ClickhouseClient.ClickhouseClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClientConfig`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:155`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Configuration for creating a ClickHouse client, combining `@clickhouse/client` options with optional span attributes and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.ClientMethod`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:405`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Fiber reference read by the low-level ClickHouse connection to choose query or command execution for statements; defaults to `query`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.ClientMethod`.
- **Suggested snippet:** Consume `ClickhouseClient.ClientMethod` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.QueryId`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:419`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Fiber reference for the ClickHouse `query_id` applied to queries and inserts; a random UUID is generated when no query ID is set.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.QueryId`.
- **Suggested snippet:** Consume `ClickhouseClient.QueryId` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.ClickhouseSettings`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:431`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Fiber reference containing ClickHouse settings to attach to queries, commands, and inserts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.ClickhouseSettings`.
- **Suggested snippet:** Consume `ClickhouseClient.ClickhouseSettings` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.makeCompiler`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:510`
- **Kind / category:** `root-declaration` / `compiler`
- **Priority:** **optional**
- **Current description:** Creates the SQL statement compiler for ClickHouse, emitting typed `{pN: Type}` placeholders and escaping identifiers with an optional query name transform.
- **Signature hint:** `declare function makeCompiler(transform?: (_: string) => string): Statement.Compiler`
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.makeCompiler`.
- **Suggested snippet:** Construct one representative value with `ClickhouseClient.makeCompiler`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.ClickhouseCustom`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:540`
- **Kind / category:** `root-declaration` / `custom types`
- **Priority:** **optional**
- **Current description:** Custom SQL fragment type used for ClickHouse typed parameters created by `ClickhouseClient.param`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-clickhouse/ClickhouseClient.ClickhouseCustom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClient (type)`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:110`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** ClickHouse-specific `SqlClient` extension with access to its configuration, typed parameter fragments, command-mode execution, insert queries, and per-effect query ID and ClickHouse settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-clickhouse/ClickhouseClient.ClickhouseClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-clickhouse/ClickhouseClient.TypeId (value)`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:92`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique runtime identifier used to tag `ClickhouseClient` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ClickhouseClient } from "@effect/sql-clickhouse"` and use `ClickhouseClient.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `ClickhouseClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-clickhouse/ClickhouseClient.TypeId (type)`

- **Source:** `packages/sql/clickhouse/src/ClickhouseClient.ts:100`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level literal for the `ClickhouseClient` runtime identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-clickhouse/ClickhouseClient.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
