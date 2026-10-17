/**
 * Runs database migrations for MySQL projects that use Effect SQL.
 *
 * This module reuses the shared SQL migrator and connects it to MySQL. It
 * exposes the common migration helpers and adds `run` and `layer` functions
 * that apply pending migration files with the current SQL client. When schema
 * dumps are requested, it uses `mysqldump` and the usual process and filesystem
 * services.
 *
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as ChildProcess from "effect/unstable/process/ChildProcess"
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner"
import * as Migrator from "effect/unstable/sql/Migrator"
import type { SqlClient } from "effect/unstable/sql/SqlClient"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { resolveAddress } from "./internal/config.ts"
import { MysqlClient } from "./MysqlClient.ts"

/**
 * @since 4.0.0
 */
export * from "effect/unstable/sql/Migrator"

/**
 * Runs MySQL migrations using the configured clients. Schema dumps use `mysqldump` and require child process, filesystem, and path services.
 *
 * @category running
 * @since 4.0.0
 */
export const run: <R2 = never>(
  options: Migrator.MigratorOptions<R2>
) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  | SqlClient
  | MysqlClient
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | R2
> = Migrator.make({
  dumpSchema(path, table) {
    // Additional behaviour goes to Effect.fnUntraced as arguments rather than
    // through .pipe, which is what the generator form expects.
    const mysqlDump = Effect.fnUntraced(function*(args: Array<string>) {
      const sql = yield* MysqlClient
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
      const address = resolveAddress(sql.config)
      const dump = yield* ChildProcess.make("mysqldump", [
        "--host",
        address.host,
        "--port",
        String(address.port),
        ...(address.username === undefined ? [] : ["--user", address.username]),
        "--skip-comments",
        "--compact",
        ...args,
        ...(address.database === undefined ? [] : [address.database])
      ], {
        env: {
          PATH: (globalThis as { readonly process?: { readonly env?: Record<string, string | undefined> } })
            .process?.env?.PATH,
          // The password goes through the environment rather than argv,
          // which any other process on the host can read.
          MYSQL_PWD: address.password
        }
      }).pipe(spawner.string)

      return dump.replace(/^\/\*.*$/gm, "")
        .replace(/\n{2,}/gm, "\n\n")
        .trim()
    }, Effect.mapError((error) => new Migrator.MigrationError({ kind: "Failed", message: error.message })))

    const dumpSchema = mysqlDump(["--no-data"])

    const dumpMigrations = mysqlDump(["--no-create-info", "--tables", table])

    const dumpAll = Effect.map(
      Effect.all([dumpSchema, dumpMigrations], { concurrency: 2 }),
      ([schema, migrations]) => schema + "\n\n" + migrations
    )

    const dumpFile = Effect.fnUntraced(function*(file: string) {
      const fs = yield* FileSystem.FileSystem
      const path_ = yield* Path.Path
      const dump = yield* dumpAll
      yield* fs.makeDirectory(path_.dirname(file), { recursive: true })
      yield* fs.writeFileString(file, dump)
    }, Effect.mapError((error) => new Migrator.MigrationError({ kind: "Failed", message: error.message })))

    return dumpFile(path)
  }
})

/**
 * Creates a layer that runs MySQL migrations during layer construction, including `mysqldump`-based schema dump support when requested.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = <R>(
  options: Migrator.MigratorOptions<R>
): Layer.Layer<
  never,
  Migrator.MigrationError | SqlError,
  | SqlClient
  | MysqlClient
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | R
> => Layer.effectDiscard(run(options))
