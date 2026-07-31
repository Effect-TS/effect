# Example Suggestions: `@effect/sql-pg/PgMigrator`

- **Package:** `@effect/sql-pg`
- **Source:** `packages/sql/pg/src/PgMigrator.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind               | Priority        |
| --------------------------------- | ---: | ------------------ | --------------- |
| `@effect/sql-pg/PgMigrator.layer` |  109 | `root-declaration` | **recommended** |
| `@effect/sql-pg/PgMigrator.run`   |   35 | `root-declaration` | **recommended** |

## Recommended

### `@effect/sql-pg/PgMigrator.layer`

- **Source:** `packages/sql/pg/src/PgMigrator.ts:109`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that runs PostgreSQL migrations during layer construction, including `pg_dump`-based schema dump support when requested.
- **Signature hint:** `declare function layer<R>(options: Migrator.MigratorOptions<R>): Layer.Layer<never, Migrator.MigrationError | SqlError, SqlClient | PgClient | ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path | R>`
- **Import guidance:** Start from `import { PgMigrator } from "@effect/sql-pg"` and use `PgMigrator.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `PgMigrator.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/sql-pg/PgMigrator.run`

- **Source:** `packages/sql/pg/src/PgMigrator.ts:35`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Runs PostgreSQL SQL migrations using the configured clients. Schema dumps use `pg_dump` and require child process, filesystem, and path services.
- **Signature hint:** `declare function run<R2 = never>(options: Migrator.MigratorOptions<R2>): Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, Migrator.MigrationError | SqlError, SqlClient | PgClient | ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path | R2>`
- **Import guidance:** Start from `import { PgMigrator } from "@effect/sql-pg"` and use `PgMigrator.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PgMigrator.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
