/**
 * @since 1.0.0
 */
import * as Command from "@effect/platform/Command"
import type { CommandExecutor } from "@effect/platform/CommandExecutor"
import { FileSystem } from "@effect/platform/FileSystem"
import { Path } from "@effect/platform/Path"
import type * as Client from "@effect/sql/Client"
import type { SqlError } from "@effect/sql/Error"
import * as Migrator from "@effect/sql/Migrator"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Secret from "effect/Secret"
import type { PgClient } from "./Client.js"

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
  Client.Client | FileSystem | Path | CommandExecutor | R
> = Migrator.make({
  dumpSchema(sql_, path, table) {
    const sql = sql_ as PgClient
    const pgDump = (args: Array<string>) =>
      Effect.gen(function*(_) {
        const dump = yield* _(
          Command.make("pg_dump", ...args, "--no-owner", "--no-privileges"),
          Command.env({
            PATH: (globalThis as any).process?.env.PATH,
            PGHOST: sql.config.host,
            PGPORT: sql.config.port?.toString(),
            PGUSER: sql.config.username,
            PGPASSWORD: sql.config.password
              ? Secret.value(sql.config.password)
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
      Effect.gen(function*(_) {
        const fs = yield* _(FileSystem)
        const path_ = yield* _(Path)
        const dump = yield* _(pgDumpAll)
        yield* _(fs.makeDirectory(path_.dirname(path), { recursive: true }))
        yield* _(fs.writeFileString(path, dump))
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
): Layer.Layer<never, SqlError | Migrator.MigrationError, R | Client.Client | FileSystem | Path | CommandExecutor> =>
  Layer.effectDiscard(run(options))
