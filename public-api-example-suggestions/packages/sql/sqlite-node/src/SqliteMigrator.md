# Example Suggestions: `@effect/sql-sqlite-node/SqliteMigrator`

- **Package:** `@effect/sql-sqlite-node`
- **Source:** `packages/sql/sqlite-node/src/SqliteMigrator.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-sqlite-node/SqliteMigrator.layer` |   84 | `root-declaration` | **recommended** |
| `@effect/sql-sqlite-node/SqliteMigrator.run`   |   28 | `root-declaration` | **recommended** |

## Recommended

### `@effect/sql-sqlite-node/SqliteMigrator.layer`

- **Source:** `packages/sql/sqlite-node/src/SqliteMigrator.ts:84`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a layer that runs the configured SQLite migrations during layer construction and provides no services.
- **Signature hint:** `declare function layer<R>(options: Migrator.MigratorOptions<R>): Layer.Layer<never, Migrator.MigrationError | SqlError, Client.SqlClient | R>`
- **Import guidance:** Start from `import { SqliteMigrator } from "@effect/sql-sqlite-node"` and use `SqliteMigrator.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `SqliteMigrator.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-sqlite-node/SqliteMigrator.run`

- **Source:** `packages/sql/sqlite-node/src/SqliteMigrator.ts:28`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs SQL migrations for a SQLite database using the shared `Migrator` implementation and the current `SqlClient`.
- **Signature hint:** `declare function run<R2 = never>(options: Migrator.MigratorOptions<R2>): Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, Migrator.MigrationError | SqlError, Client.SqlClient | R2>`
- **Import guidance:** Start from `import { SqliteMigrator } from "@effect/sql-sqlite-node"` and use `SqliteMigrator.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqliteMigrator.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
