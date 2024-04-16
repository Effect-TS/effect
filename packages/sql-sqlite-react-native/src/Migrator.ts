/**
 * @since 1.0.0
 */
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
  Client.SqliteClient | R
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
  dumpSchema(_sql, _path, _table) {
    return Effect.unit
  }
})

/**
 * @category constructor
 * @since 1.0.0
 */
export const makeLayer = (
  options: Migrator.MigratorOptions
): Layer.Layer<never, SqlError | Migrator.MigrationError, Client.SqliteClient> => Layer.effectDiscard(run(options))
