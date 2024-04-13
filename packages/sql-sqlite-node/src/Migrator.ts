/**
 * @since 1.0.0
 */
import * as Command from "@effect/platform/Command"
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import { FileSystem } from "@effect/platform/FileSystem"
import { Path } from "@effect/platform/Path"
import type { SqlError } from "@effect/sql/Error"
import * as Migrator from "@effect/sql/Migrator"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Client from "./Client.js"

/**
 * @since 1.0.0
 */
export * from "@effect/sql/Migrator"

/**
 * @category constructor
 * @since 1.0.0
 */
export const run: <R>(
  options: Migrator.MigratorOptions<R>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError | Migrator.MigrationError,
  Client.SqliteClient | R | FileSystem | Path | CommandExecutor
> = Migrator.make({
  getClient: Client.SqliteClient,
  ensureTable(sql, table) {
    return sql`
      CREATE TABLE IF NOT EXISTS ${sql(table)} (
        migration_id integer PRIMARY KEY NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp,
        name VARCHAR(255) NOT NULL
      )
    `
  },
  dumpSchema(sql, path, table) {
    const dump = (args: Array<string>) =>
      Effect.gen(function*(_) {
        const dump = yield* _(
          Command.make("sqlite3", sql.config.filename, ...args),
          Command.string
        )
        return dump.replace(/^create table sqlite_sequence\(.*$/im, "")
          .replace(/\n{2,}/gm, "\n\n")
          .trim()
      }).pipe(
        Effect.mapError((error) => new Migrator.MigrationError({ reason: "failed", message: error.message }))
      )

    const dumpSchema = dump([".schema"])

    const dumpMigrations = dump([
      "--cmd",
      `.mode insert ${table}`,
      `select * from ${table}`
    ])

    const dumpAll = Effect.map(
      Effect.all([dumpSchema, dumpMigrations], { concurrency: 2 }),
      ([schema, migrations]) => schema + "\n\n" + migrations
    )

    const dumpFile = (file: string) =>
      Effect.gen(function*(_) {
        const fs = yield* _(FileSystem)
        const path = yield* _(Path)
        const dump = yield* _(dumpAll)
        yield* _(fs.makeDirectory(path.dirname(file), { recursive: true }))
        yield* _(fs.writeFileString(file, dump))
      }).pipe(
        Effect.mapError((error) => new Migrator.MigrationError({ reason: "failed", message: error.message }))
      )

    return dumpFile(path)
  }
})

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeLayer = (
  options: Migrator.MigratorOptions
): Layer.Layer<never, SqlError | Migrator.MigrationError, Client.SqliteClient | FileSystem | Path | CommandExecutor> =>
  Layer.effectDiscard(run(options))
