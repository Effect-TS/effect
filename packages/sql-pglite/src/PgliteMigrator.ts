/**
 * @since 1.0.0
 */
import { FileSystem } from "@effect/platform/FileSystem"
import { Path } from "@effect/platform/Path"
import * as Migrator from "@effect/sql/Migrator"
import type * as Client from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import { pgDump } from "@electric-sql/pglite-tools/pg_dump"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PgliteClient } from "./PgliteClient.js"

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
  FileSystem | Path | PgliteClient | Client.SqlClient | R2
> = Migrator.make({
  dumpSchema(path, table) {
    const runPgDump = (args: Array<string>) =>
      Effect.gen(function*() {
        const pg = yield* PgliteClient
        return Effect.tryPromise({
          try: async () => {
            const file = await pgDump({ pg: pg.client, args })
            return (await file.text())
              .replace(/^--.*$/gm, "")
              .replace(/^SET .*$/gm, "")
              .replace(/^SELECT pg_catalog\..*$/gm, "")
              .replace(/\n{2,}/gm, "\n\n")
              .trim()
          },
          catch: (error) =>
            new Migrator.MigrationError({
              reason: "failed",
              message: error instanceof Error ? error.message : String(error)
            })
        })
      })

    const pgDumpSchema = runPgDump(["--schema-only"])

    const pgDumpMigrations = runPgDump(["--column-inserts", "--data-only", `--table=${table}`])

    const pgDumpAll = Effect.map(
      Effect.all([pgDumpSchema, pgDumpMigrations], { concurrency: 2 }),
      ([schema, migrations]) => schema + "\n\n" + migrations
    )

    const pgDumpFile = (path: string) =>
      Effect.gen(function*() {
        const fs = yield* FileSystem
        const { dirname } = yield* Path
        const dump = yield* pgDumpAll
        yield* fs.makeDirectory(dirname(path), { recursive: true })
        yield* fs.writeFileString(path, dump)
      }).pipe(
        Effect.mapError(
          (error) => new Migrator.MigrationError({ reason: "failed", message: error.message })
        )
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
  PgliteClient | Client.SqlClient | FileSystem | Path | R
> => Layer.effectDiscard(run(options))
