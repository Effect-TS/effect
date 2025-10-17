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
import { MysqlClient } from "./MysqlClient.js"

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
  FileSystem | Path | MysqlClient | Client.SqlClient | CommandExecutor | R2
> = Migrator.make({
  dumpSchema(path, table) {
    const mysqlDump = (args: Array<string>) =>
      Effect.gen(function*() {
        const sql = yield* MysqlClient

        const url = sql.config.url ? new URL(Redacted.value(sql.config.url)) : undefined

        const host = url?.hostname ?? sql.config.host
        const port = url?.port ?? sql.config.port?.toString()
        const username = url?.username ?? sql.config.username
        const password = url?.password ? Redacted.make(url.password) : sql.config.password
        const database = url?.pathname?.slice(1) ?? sql.config.database

        const dump = yield* pipe(
          Command.make(
            "mysqldump",
            ...(host ? ["-h", host] : []),
            ...(port ? ["-P", port] : []),
            ...(username ? ["-u", username] : []),
            ...(password ? [`-p${Redacted.value(password)}`] : []),
            ...(database ? [database] : []),
            "--skip-comments",
            "--compact",
            ...args
          ),
          Command.env({
            PATH: (globalThis as any).process?.env.PATH
          }),
          Command.string
        )

        return dump.replace(/^\/\*.*$/gm, "")
          .replace(/\n{2,}/gm, "\n\n")
          .trim()
      }).pipe(
        Effect.mapError((error) => new Migrator.MigrationError({ reason: "failed", message: error.message }))
      )

    const dumpSchema = mysqlDump(["--no-data"])

    const dumpMigrations = mysqlDump(["--no-create-info", "--tables", table])

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
 * @category layers
 * @since 1.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  Migrator.MigrationError | SqlError,
  MysqlClient | Client.SqlClient | CommandExecutor | FileSystem | Path | R
> => Layer.effectDiscard(run(options))
