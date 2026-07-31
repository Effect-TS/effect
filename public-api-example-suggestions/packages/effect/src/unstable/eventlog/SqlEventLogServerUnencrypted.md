# Example Suggestions: `effect/unstable/eventlog/SqlEventLogServerUnencrypted`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                  | Line | Kind               | Priority        |
| -------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/SqlEventLogServerUnencrypted.makeStorage`  |   37 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/SqlEventLogServerUnencrypted.layerStorage` |  448 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/eventlog/SqlEventLogServerUnencrypted.makeStorage`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts:37`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates unencrypted event-log server `Storage` backed by SQL.
- **Signature hint:** `declare function makeStorage(options?: { readonly entryTablePrefix?: string; readonly remoteIdTable?: string; readonly insertBatchSize?: number; }): Effect.Effect<EventLogServerUnencrypted.Storage['Service'], SqlError.SqlError, SqlClient.SqlClient | Scope.Scope>`
- **Import guidance:** Start from `import { SqlEventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `SqlEventLogServerUnencrypted.makeStorage`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlEventLogServerUnencrypted.makeStorage`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/SqlEventLogServerUnencrypted.layerStorage`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts:448`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides unencrypted server `Storage` using the SQL-backed implementation.
- **Signature hint:** `declare function layerStorage(options?: { readonly entryTablePrefix?: string; readonly remoteIdTable?: string; readonly insertBatchSize?: number; }): Layer.Layer<EventLogServerUnencrypted.Storage, SqlError.SqlError, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { SqlEventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `SqlEventLogServerUnencrypted.layerStorage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlEventLogServerUnencrypted.layerStorage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
