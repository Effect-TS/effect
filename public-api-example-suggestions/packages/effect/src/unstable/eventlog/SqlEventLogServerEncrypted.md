# Example Suggestions: `effect/unstable/eventlog/SqlEventLogServerEncrypted`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/SqlEventLogServerEncrypted.makeStorage`        |   38 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/SqlEventLogServerEncrypted.layerStorage`       |  312 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/SqlEventLogServerEncrypted.layerStorageSubtle` |  329 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/eventlog/SqlEventLogServerEncrypted.makeStorage`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts:38`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates encrypted event-log server `Storage` backed by SQL.
- **Signature hint:** `declare function makeStorage(options?: { readonly entryTablePrefix?: string; readonly remoteIdTable?: string; readonly insertBatchSize?: number; }): Effect.Effect<EventLogServerEncrypted.Storage['Service'], SqlError.SqlError, SqlClient.SqlClient | EventLogEncryption.EventLogEncryption | Scope.Scope>`
- **Import guidance:** Start from `import { SqlEventLogServerEncrypted } from "effect/unstable/eventlog"` and use `SqlEventLogServerEncrypted.makeStorage`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlEventLogServerEncrypted.makeStorage`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/SqlEventLogServerEncrypted.layerStorage`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts:312`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides encrypted server `Storage` using the SQL-backed implementation.
- **Signature hint:** `declare function layerStorage(options?: { readonly entryTablePrefix?: string; readonly remoteIdTable?: string; readonly insertBatchSize?: number; }): Layer.Layer<EventLogServerEncrypted.Storage, SqlError.SqlError, SqlClient.SqlClient | EventLogEncryption.EventLogEncryption>`
- **Import guidance:** Start from `import { SqlEventLogServerEncrypted } from "effect/unstable/eventlog"` and use `SqlEventLogServerEncrypted.layerStorage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlEventLogServerEncrypted.layerStorage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/SqlEventLogServerEncrypted.layerStorageSubtle`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts:329`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides SQL-backed encrypted server `Storage` and supplies the default Web Crypto `EventLogEncryption` layer.
- **Signature hint:** `declare function layerStorageSubtle(options?: { readonly entryTablePrefix?: string; readonly remoteIdTable?: string; readonly insertBatchSize?: number; }): Layer.Layer<EventLogServerEncrypted.Storage, SqlError.SqlError, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { SqlEventLogServerEncrypted } from "effect/unstable/eventlog"` and use `SqlEventLogServerEncrypted.layerStorageSubtle`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlEventLogServerEncrypted.layerStorageSubtle`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
