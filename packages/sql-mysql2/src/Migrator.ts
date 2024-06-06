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
import * as Redacted from "effect/Redacted"
import { MysqlClient } from "./Client.js"

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
  FileSystem | Path | MysqlClient | Client.Client | CommandExecutor | R2
> = Migrator.make({
  dumpSchema(path, table) {
    const mysqlDump = (args: Array<string>) =>
      Effect.gen(function*(_) {
        const sql = yield* MysqlClient
        const dump = yield* _(
          Command.make(
            "mysqldump",
            ...(sql.config.username ? ["-u", sql.config.username] : []),
            ...(sql.config.database ? [sql.config.database] : []),
            "--skip-comments",
            "--compact",
            ...args
          ),
          Command.env({
            PATH: (globalThis as any).process?.env.PATH,
            MYSQL_HOST: sql.config.host,
            MYSQL_TCP_PORT: sql.config.port?.toString(),
            MYSQL_PWD: sql.config.password
              ? Redacted.value(sql.config.password)
              : undefined
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
 * @category layers
 * @since 1.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  Migrator.MigrationError | SqlError,
  MysqlClient | Client.Client | CommandExecutor | FileSystem | Path | R
> => Layer.effectDiscard(run(options))
