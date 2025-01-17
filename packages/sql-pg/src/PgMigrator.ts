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
import * as Redacted from "effect/Redacted"
import { PgClient } from "./PgClient.js"

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
  FileSystem | Path | PgClient | Client.SqlClient | CommandExecutor | R2
> = Migrator.make({
  dumpSchema(path, table) {
    const pgDump = (args: Array<string>) =>
      Effect.gen(function*() {
        const sql = yield* PgClient
        const dump = yield* pipe(
          Command.make("pg_dump", ...args, "--no-owner", "--no-privileges"),
          Command.env({
            PATH: (globalThis as any).process?.env.PATH,
            PGHOST: sql.config.host,
            PGPORT: sql.config.port?.toString(),
            PGUSER: sql.config.username,
            PGPASSWORD: sql.config.password
              ? Redacted.value(sql.config.password)
              : undefined,
            PGDATABASE: sql.config.database,
            PGSSLMODE: sql.config.ssl ? "require" : "prefer"
          }),
          Command.string
        )

        return dump.replace(/^--.*$/gm, "")
          .replace(/^SET .*$/gm, "")
          .replace(/^SELECT pg_catalog\..*$/gm, "")
          .replace(/\n{2,}/gm, "\n\n")
          .trim()
      }).pipe(
        Effect.mapError((error) => new Migrator.MigrationError({ reason: "failed", message: error.message }))
      )

    const pgDumpSchema = pgDump(["--schema-only"])

    const pgDumpMigrations = pgDump([
      "--column-inserts",
      "--data-only",
      `--table=${table}`
    ])

    const pgDumpAll = Effect.map(
      Effect.all([pgDumpSchema, pgDumpMigrations], { concurrency: 2 }),
      ([schema, migrations]) => schema + "\n\n" + migrations
    )

    const pgDumpFile = (path: string) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem
        const path_ = yield* Path
        const dump = yield* pgDumpAll
        yield* fs.makeDirectory(path_.dirname(path), { recursive: true })
        yield* fs.writeFileString(path, dump)
      }).pipe(
        Effect.mapError((error) => new Migrator.MigrationError({ reason: "failed", message: error.message }))
      )

    return pgDumpFile(path)
  }
})

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  Migrator.MigrationError | SqlError,
  PgClient | Client.SqlClient | CommandExecutor | FileSystem | Path | R
> => Layer.effectDiscard(run(options))
