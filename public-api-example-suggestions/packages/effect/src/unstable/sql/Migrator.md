# Example Suggestions: `effect/unstable/sql/Migrator`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/sql/Migrator.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 3 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/sql/Migrator.MigrationError`    |   79 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Migrator.make`              |   99 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Migrator.fromRecord`        |  383 | `root-declaration` | **recommended** |
| `effect/unstable/sql/Migrator.MigratorOptions`   |   28 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.fromGlob`          |  336 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.fromBabelGlob`     |  361 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.fromFileSystem`    |  406 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.Loader`            |   41 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.ResolvedMigration` |   54 | `root-declaration` | **optional**    |
| `effect/unstable/sql/Migrator.Migration`         |   67 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/sql/Migrator.MigrationError`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:79`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised while loading, validating, locking, or running SQL migrations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.MigrationError`.
- **Suggested snippet:** Create or capture `Migrator.MigrationError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/Migrator.make`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:99`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a migrator that ensures the migrations table exists, runs pending migrations in a transaction, and optionally dumps the schema after successful migrations.
- **Signature hint:** `declare function make<RD = never>({ dumpSchema }: { dumpSchema?: (path: string, migrationsTable: string) => Effect.Effect<void, MigrationError, RD>; }): <R2 = never>({ loader, schemaDirectory, table }: MigratorOptions<R2>) => Effect.Effect<ReadonlyArray<readonly [id: number, name: string]>, MigrationError | SqlError, Client.SqlClient | RD | R2>`
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Migrator.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/sql/Migrator.fromRecord`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:383`
- **Kind / category:** `root-declaration` / `loaders`
- **Priority:** **recommended**
- **Current description:** Creates a migration loader from a record of migration effects keyed by `<id>_<name>`, sorted by migration id.
- **Signature hint:** `declare function fromRecord(migrations: Record<string, Effect.Effect<void, unknown, Client.SqlClient>>): Loader`
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.fromRecord`.
- **Suggested snippet:** Convert one representative external input with `Migrator.fromRecord` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/sql/Migrator.MigratorOptions`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:28`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for running SQL migrations, including the migration loader, optional schema dump directory, and migrations table name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Migrator.MigratorOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.fromGlob`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:336`
- **Kind / category:** `root-declaration` / `loaders`
- **Priority:** **optional**
- **Current description:** Creates a migration loader from a glob record of dynamic import functions, parsing files named `<id>_<name>.js`, `<id>_<name>.ts`, `<id>_<name>.mjs`, or `<id>_<name>.mts` and sorting migrations by id.
- **Signature hint:** `declare function fromGlob(migrations: Record<string, () => Promise<any>>): Loader`
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.fromGlob`.
- **Suggested snippet:** Convert one representative external input with `Migrator.fromGlob` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.fromBabelGlob`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:361`
- **Kind / category:** `root-declaration` / `loaders`
- **Priority:** **optional**
- **Current description:** Creates a migration loader from a Babel-style glob record, parsing keys such as `_<id>_<name>Js`, `_<id>_<name>Ts`, `_<id>_<name>Mjs`, or `_<id>_<name>Mts` and sorting migrations by id.
- **Signature hint:** `declare function fromBabelGlob(migrations: Record<string, any>): Loader`
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.fromBabelGlob`.
- **Suggested snippet:** Convert one representative external input with `Migrator.fromBabelGlob` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.fromFileSystem`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:406`
- **Kind / category:** `root-declaration` / `loaders`
- **Priority:** **optional**
- **Current description:** Creates a migration loader that reads a directory with `FileSystem`, imports files named `<id>_<name>.js`, `<id>_<name>.ts`, `<id>_<name>.mjs`, or `<id>_<name>.mts`, and sorts migrations by id.
- **Signature hint:** `declare function fromFileSystem(directory: string): Loader<FileSystem>`
- **Import guidance:** Start from `import { Migrator } from "effect/unstable/sql"` and use `Migrator.fromFileSystem`.
- **Suggested snippet:** Convert one representative external input with `Migrator.fromFileSystem` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.Loader`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect that resolves the available migrations for the migrator or fails with a `MigrationError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Migrator.Loader`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.ResolvedMigration`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tuple produced by a migration loader, containing the migration id, migration name, and an effect that loads the migration implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Migrator.ResolvedMigration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/sql/Migrator.Migration`

- **Source:** `packages/effect/src/unstable/sql/Migrator.ts:67`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata for a migration recorded in the migrations table, including its id, name, and creation timestamp.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/sql/Migrator.Migration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
