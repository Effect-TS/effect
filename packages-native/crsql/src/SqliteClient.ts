/**
 * CR-SQLite compatible Sqlite client tag and type.
 *
 * This augments the base `@effect/sql` `SqlClient` with the SQLite-specific
 * ability to `loadExtension`, which CR-SQLite requires to activate its
 * functionality on a connection.
 *
 * Implementations are provided by platform drivers such as
 * `@effect/sql-sqlite-node` and `@effect/sql-sqlite-bun`, which already expose
 * a `loadExtension` method. This tag allows CR-SQLite helpers to depend on the
 * minimal capability needed across platforms.
 *
 * @since 0.1.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import { Effect } from "effect"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Layer from "effect/Layer"

/**
 * Extends the generic `SqlClient` with SQLite's `loadExtension` capability.
 *
 * @since 0.1.0
 */
export interface SqliteClient extends SqlClient.SqlClient {
  /**
   * Loads a SQLite extension from a full filesystem path.
   *
   * Required to enable CR-SQLite (crsqlite) for the current connection.
   */
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>
}

/**
 * Tag for a CR-SQLite compatible SQLite client.
 *
 * @since 0.1.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>(
  "@effect-native/crsql/SqliteClient"
)

/**
 * Error raised when a base `SqlClient` does not support `loadExtension`.
 *
 * @since 0.1.0
 */
export class SqliteClientError extends Data.TaggedError("SqliteClientError")<{
  cause: unknown
}> {}

/**
 * Loads a SQLite extension (e.g., CR‑SQLite) on the current connection.
 *
 * @since 0.1.0
 */
export const loadExtension = Effect.fn("@effect-native/crsql/SqlClient#loadExtension")(
  function*(path: string) {
    const sql = (yield* SqlClient.SqlClient) as SqlClient.SqlClient | SqliteClient
    if (!("loadExtension" in sql && typeof sql.loadExtension === "function")) {
      // NOTE: ✅ Modern Effect v3.17+ (preferred), no Effect.fail needed
      return yield* new SqliteClientError({ cause: "SqlClient missing loadExtension method" })
    }
    return yield* sql.loadExtension(path)
  }
)

/**
 * Validates a base `SqlClient` supports `loadExtension` and narrows it to `SqliteClient`.
 *
 * @since 0.1.0
 */
export const fromSqlClient = Effect.fn("@effect-native/crsql/SqlClient#from")(
  function*(sql: SqlClient.SqlClient | SqliteClient) {
    if (!("loadExtension" in sql && typeof sql.loadExtension === "function")) {
      // NOTE: ✅ Modern Effect v3.17+ (preferred), no Effect.fail needed
      return yield* new SqliteClientError({ cause: "SqlClient missing loadExtension method" })
    }
    return sql as SqliteClient
  }
)

/**
 * Provides a `SqliteClient` instance into the environment.
 *
 * @since 0.1.0
 */
export const layer = (sql: SqliteClient) => Layer.succeed(SqliteClient, sql)

/**
 * Lifts a base `SqlClient` into a `SqliteClient` if it exposes `loadExtension`.
 *
 * @since 0.1.0
 */
export const layerFromSqlClient = (sql: SqlClient.SqlClient | SqliteClient) =>
  Layer.effect(SqliteClient, fromSqlClient(sql))
