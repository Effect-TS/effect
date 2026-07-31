# Example Suggestions: `@effect/sql-d1/D1Client`

- **Package:** `@effect/sql-d1`
- **Source:** `packages/sql/d1/src/D1Client.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 4 recommended, 4 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-d1/D1Client.make`                  |  198 | `root-declaration` | **recommended** |
| `@effect/sql-d1/D1Client.layerConfig`           |  374 | `root-declaration` | **recommended** |
| `@effect/sql-d1/D1Client.layer`                 |  394 | `root-declaration` | **recommended** |
| `@effect/sql-d1/D1Client.D1Client (value)`      |  102 | `root-declaration` | **recommended** |
| `@effect/sql-d1/D1Client.D1Client (type)`       |   58 | `root-declaration` | **optional**    |
| `@effect/sql-d1/D1Client.D1Client.batch`        |   78 | `member`           | **optional**    |
| `@effect/sql-d1/D1Client.D1Client.updateValues` |   88 | `member`           | **optional**    |
| `@effect/sql-d1/D1Client.D1ClientConfig`        |  110 | `root-declaration` | **optional**    |
| `@effect/sql-d1/D1Client.TypeId (value)`        |   42 | `root-declaration` | **discouraged** |
| `@effect/sql-d1/D1Client.TypeId (type)`         |   50 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/sql-d1/D1Client.make`

- **Source:** `packages/sql/d1/src/D1Client.ts:198`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped Cloudflare D1 SQL client. Prepared statements are cached, while transactions and streaming queries are not supported by this driver.
- **Signature hint:** `declare function make(options: D1ClientConfig): Effect.Effect<D1Client, never, Scope.Scope | Reactivity.Reactivity>`
- **Import guidance:** Start from `import { D1Client } from "@effect/sql-d1"` and use `D1Client.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `D1Client.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-d1/D1Client.layerConfig`

- **Source:** `packages/sql/d1/src/D1Client.ts:374`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a `Config`-wrapped D1 client configuration, providing both `D1Client` and `SqlClient`.
- **Signature hint:** `declare function layerConfig(config: Config.Wrap<D1ClientConfig>): Layer.Layer<D1Client | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { D1Client } from "@effect/sql-d1"` and use `D1Client.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `D1Client.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-d1/D1Client.layer`

- **Source:** `packages/sql/d1/src/D1Client.ts:394`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer from a concrete D1 client configuration, providing both `D1Client` and `SqlClient`.
- **Signature hint:** `declare function layer(config: D1ClientConfig): Layer.Layer<D1Client | Client.SqlClient, Config.ConfigError>`
- **Import guidance:** Start from `import { D1Client } from "@effect/sql-d1"` and use `D1Client.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `D1Client.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-d1/D1Client.D1Client (value)`

- **Source:** `packages/sql/d1/src/D1Client.ts:102`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Cloudflare D1 SQL client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { D1Client } from "@effect/sql-d1"` and use `D1Client.D1Client`.
- **Suggested snippet:** Consume `D1Client.D1Client` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-d1/D1Client.D1Client (type)`

- **Source:** `packages/sql/d1/src/D1Client.ts:58`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Cloudflare D1 SQL client service, extending `SqlClient` with its D1 configuration and no `updateValues` support.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-d1/D1Client.D1Client`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-d1/D1Client.D1Client.batch`

- **Source:** `packages/sql/d1/src/D1Client.ts:78`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes SQL statements as a single atomic D1 batch and returns their row results in order.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-d1/D1Client.D1Client.batch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-d1/D1Client.D1Client.updateValues`

- **Source:** `packages/sql/d1/src/D1Client.ts:88`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Not supported in d1
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/sql-d1/D1Client.D1Client.updateValues` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/sql-d1/D1Client.D1ClientConfig`

- **Source:** `packages/sql/d1/src/D1Client.ts:110`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for a Cloudflare D1 client, including the `D1Database`, prepared statement cache settings, span attributes, and query/result name transforms.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-d1/D1Client.D1ClientConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/sql-d1/D1Client.TypeId (value)`

- **Source:** `packages/sql/d1/src/D1Client.ts:42`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique runtime identifier used to tag `D1Client` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { D1Client } from "@effect/sql-d1"` and use `D1Client.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `D1Client.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/sql-d1/D1Client.TypeId (type)`

- **Source:** `packages/sql/d1/src/D1Client.ts:50`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level literal for the `D1Client` runtime identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `@effect/sql-d1/D1Client.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
