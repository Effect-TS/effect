# Example Suggestions: `@effect/sql-sqlite-wasm/OpfsWorker`

- **Package:** `@effect/sql-sqlite-wasm`
- **Source:** `packages/sql/sqlite-wasm/src/OpfsWorker.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority        |
| ----------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-wasm/OpfsWorker.run`              |   42 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-wasm/OpfsWorker.OpfsWorkerConfig` |   31 | `root-declaration` | **optional**    |

## Recommended

### `@effect/sql-sqlite-wasm/OpfsWorker.run`

- **Source:** `packages/sql/sqlite-wasm/src/OpfsWorker.ts:42`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs the SQLite OPFS worker loop, opening the configured database, posting a ready message, handling query/import/export/update-hook messages, and closing when a close message is received.
- **Signature hint:** `declare function run(options: OpfsWorkerConfig): Effect.Effect<void, SqlError>`
- **Import guidance:** Start from `import { OpfsWorker } from "@effect/sql-sqlite-wasm"` and use `OpfsWorker.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpfsWorker.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/sql-sqlite-wasm/OpfsWorker.OpfsWorkerConfig`

- **Source:** `packages/sql/sqlite-wasm/src/OpfsWorker.ts:31`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the SQLite OPFS worker, including the message port used for the client protocol and the OPFS database name to open.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/sql-sqlite-wasm/OpfsWorker.OpfsWorkerConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
