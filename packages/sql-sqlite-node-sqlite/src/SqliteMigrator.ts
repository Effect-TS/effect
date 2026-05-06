/**
 * @since 1.0.0
 */
import * as Command from "@effect/platform/Command"
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import { FileSystem } from "@effect/platform/FileSystem"
import { Path } from "@effect/platform/Path"
import * as Migrator from "@effect/sql/Migrator"
import type * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import { SqliteClient } from "./SqliteClient.js"

/**
 * @since 1.0.0
 */
export * from "@effect/sql/Migrator"

/**
 * @since 1.0.0
 */
export * from "@effect/sql/Migrator/FileSystem"

/**
 * @category constructor
 * @since 1.0.0
 */
export const run: <R2 = never>(
  options: Migrator.MigratorOptions<R2>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  FileSystem | Path | SqliteClient | Client.SqlClient | CommandExecutor | R2
> = Migrator.make({
  dumpSchema(path, table) {
    const dump = (args: Array<string>) =>
      Effect.gen(function*() {
        const sql = yield* SqliteClient
        const dump = yield* pipe(
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
      Effect.gen(function*() {
        const fs = yield* FileSystem
        const path = yield* Path
        const dump = yield* dumpAll
        yield* fs.makeDirectory(path.dirname(file), { recursive: true })
        yield* fs.writeFileString(file, dump)
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
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  SqlError | Migrator.MigrationError,
  SqliteClient | Client.SqlClient | CommandExecutor | FileSystem | Path | R
> => Layer.effectDiscard(run(options))
