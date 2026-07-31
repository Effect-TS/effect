# Example Suggestions: `effect/unstable/eventlog/SqlEventJournal`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/SqlEventJournal.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/SqlEventJournal.layer` |  311 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/SqlEventJournal.make`  |   34 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/eventlog/SqlEventJournal.layer`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventJournal.ts:311`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `EventJournal` using the SQL-backed implementation created by `make`.
- **Signature hint:** `declare function layer(options?: { readonly entryTable?: string; readonly remotesTable?: string; }): Layer.Layer<EventJournal.EventJournal, SqlError.SqlError, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { SqlEventJournal } from "effect/unstable/eventlog"` and use `SqlEventJournal.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlEventJournal.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/SqlEventJournal.make`

- **Source:** `packages/effect/src/unstable/eventlog/SqlEventJournal.ts:34`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `EventJournal` backed by a SQL database.
- **Signature hint:** `declare function make(options?: { readonly entryTable?: string; readonly remotesTable?: string; }): Effect.Effect<EventJournal.EventJournal['Service'], SqlError.SqlError, SqlClient.SqlClient>`
- **Import guidance:** Start from `import { SqlEventJournal } from "effect/unstable/eventlog"` and use `SqlEventJournal.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlEventJournal.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
