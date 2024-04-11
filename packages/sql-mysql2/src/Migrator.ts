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
import * as Secret from "effect/Secret"
import * as Client from "./Client.js"

/**
 * @since 1.0.0
 */
export * from "@effect/sql/Migrator"

/**
 * @category constructor
 * @since 1.0.0
 */
export const run: (
  options: Migrator.MigratorOptions
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  SqlError | Migrator.MigrationError,
  Client.MysqlClient | FileSystem | Path | CommandExecutor
> = Migrator.make({
  getClient: Client.MysqlClient,
  ensureTable(sql, table) {
    return sql`
      CREATE TABLE IF NOT EXISTS ${sql(table)} (
        migration_id INTEGER UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        name VARCHAR(255) NOT NULL,
        PRIMARY KEY (migration_id)
      )
    `
  },
  lockTable(sql, table) {
    return sql`
      LOCK TABLE ${sql(table)} IN ACCESS EXCLUSIVE MODE
    `
  },
  dumpSchema(sql, path, table) {
    const mysqlDump = (args: Array<string>) =>
      Effect.gen(function*(_) {
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
              ? Secret.value(sql.config.password)
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

    const dumpFile = (path: string) =>
      Effect.gen(function*(_) {
        const fs = yield* _(FileSystem)
        const path_ = yield* _(Path)
        const dump = yield* _(dumpAll)
        yield* _(fs.makeDirectory(path_.dirname(path), { recursive: true }))
        yield* _(fs.writeFileString(path, dump))
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
export const layer = (
  options: Migrator.MigratorOptions
): Layer.Layer<never, SqlError | Migrator.MigrationError, Client.MysqlClient | FileSystem | Path | CommandExecutor> =>
  Layer.effectDiscard(run(options))
