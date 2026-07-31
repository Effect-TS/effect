# Example Suggestions: `@effect/sql-libsql/LibsqlMigrator`

- **Package:** `@effect/sql-libsql`
- **Source:** `packages/sql/libsql/src/LibsqlMigrator.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-libsql/LibsqlMigrator.layer` |   44 | `root-declaration` | **recommended** |
| `@effect/sql-libsql/LibsqlMigrator.run`   |   30 | `root-declaration` | **recommended** |

## Recommended

### `@effect/sql-libsql/LibsqlMigrator.layer`

- **Source:** `packages/sql/libsql/src/LibsqlMigrator.ts:44`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a layer that runs the configured SQL migrations during layer construction.
- **Signature hint:** `declare function layer<R>(options: Migrator.MigratorOptions<R>): Layer.Layer<never, Migrator.MigrationError | SqlError, Client.SqlClient | R>`
- **Import guidance:** Start from `import { LibsqlMigrator } from "@effect/sql-libsql"` and use `LibsqlMigrator.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `LibsqlMigrator.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-libsql/LibsqlMigrator.run`

- **Source:** `packages/sql/libsql/src/LibsqlMigrator.ts:30`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs SQL migrations using the configured `SqlClient`, returning the migrations that were applied.
- **Signature hint:** `declare function run<R2 = never>(options: Migrator.MigratorOptions<R2>): Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, Migrator.MigrationError | SqlError, Client.SqlClient | R2>`
- **Import guidance:** Start from `import { LibsqlMigrator } from "@effect/sql-libsql"` and use `LibsqlMigrator.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `LibsqlMigrator.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
