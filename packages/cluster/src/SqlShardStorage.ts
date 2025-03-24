/**
 * @since 1.0.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { PersistenceError } from "./ClusterError.js"
import * as ShardStorage from "./ShardStorage.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options?: {
  readonly prefix?: string | undefined
}) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const prefix = options?.prefix ?? "cluster"
  const table = (name: string) => `${prefix}_${name}`

  const runnersTable = table("runners")
  const runnersTableSql = sql(runnersTable)

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${runnersTableSql}', N'U') IS NULL
        CREATE TABLE ${runnersTableSql} (
          address VARCHAR(255) PRIMARY KEY,
          runner TEXT NOT NULL
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          address VARCHAR(255) PRIMARY KEY,
          runner TEXT NOT NULL
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          address VARCHAR(255) PRIMARY KEY,
          runner TEXT NOT NULL
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          address TEXT PRIMARY KEY,
          runner TEXT NOT NULL
        )
      `
  })

  const shardsTable = table("shards")
  const shardsTableSql = sql(shardsTable)

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${shardsTableSql}', N'U') IS NULL
        CREATE TABLE ${shardsTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id INTEGER PRIMARY KEY,
          address TEXT
        )
      `
  })

  const locksTable = table("locks")
  const locksTableSql = sql(locksTable)

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${locksTableSql}', N'U') IS NULL
        CREATE TABLE ${locksTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at DATETIME NOT NULL
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at DATETIME NOT NULL
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id INT PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at TIMESTAMP NOT NULL
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id INTEGER PRIMARY KEY,
          address TEXT NOT NULL,
          acquired_at DATETIME NOT NULL
        )
      `
  })

  const sqlNowString = sql.onDialectOrElse({
    pg: () => "NOW()",
    mysql: () => "NOW()",
    mssql: () => "GETDATE()",
    orElse: () => "CURRENT_TIMESTAMP"
  })
  const sqlNow = sql.literal(sqlNowString)

  const lockExpiresAt = sql.onDialectOrElse({
    pg: () => sql`${sqlNow} - INTERVAL '120 seconds'`,
    mysql: () => sql`DATE_SUB(${sqlNow}, INTERVAL 120 SECOND)`,
    mssql: () => sql`DATEADD(SECOND, -120, ${sqlNow})`,
    orElse: () => sql`datetime(${sqlNow}, '-120 seconds')`
  })

  const acquireLock = sql.onDialectOrElse({
    pg: () => (address: string, values: Array<any>) =>
      sql`
        INSERT INTO ${locksTableSql} (shard_id, address, acquired_at) VALUES ${sql.csv(values)}
        ON CONFLICT (shard_id) DO UPDATE
        SET address = ${address}, acquired_at = ${sqlNow}
        WHERE ${locksTableSql}.address = ${address}
          OR ${locksTableSql}.acquired_at < ${lockExpiresAt}
      `,
    mysql: () => (_address: string, values: Array<any>) =>
      sql`
        INSERT INTO ${locksTableSql} (shard_id, address, acquired_at) VALUES ${sql.csv(values)}
        ON DUPLICATE KEY UPDATE
        address = IF(address = VALUES(address) OR acquired_at < ${lockExpiresAt}, VALUES(address), address),
        acquired_at = IF(address = VALUES(address) OR acquired_at < ${lockExpiresAt}, VALUES(acquired_at), acquired_at)
      `.unprepared,
    mssql: () => (_address: string, values: Array<any>) =>
      sql`
        MERGE ${locksTableSql} WITH (HOLDLOCK) AS target
        USING (SELECT * FROM (VALUES ${sql.csv(values)})) AS source (shard_id, address, acquired_at)
        ON target.shard_id = source.shard_id
        WHEN MATCHED AND (target.address = source.address OR DATEDIFF(SECOND, target.acquired_at, ${sqlNow}) > 120) THEN
          UPDATE SET address = source.address, acquired_at = source.acquired_at
        WHEN NOT MATCHED THEN
          INSERT (shard_id, address, acquired_at)
          VALUES (source.shard_id, source.address, source.acquired_at);
      `,
    orElse: () => (address: string, values: Array<any>) =>
      // sqlite
      sql`
        WITH source(shard_id, address, acquired_at) AS (VALUES ${sql.csv(values)})
        INSERT INTO ${locksTableSql} (shard_id, address, acquired_at)
        SELECT source.shard_id, source.address, source.acquired_at
        FROM source
        WHERE NOT EXISTS (
          SELECT 1 FROM ${locksTableSql}
          WHERE shard_id = source.shard_id
          AND address != ${address}
          AND (strftime('%s', ${sqlNow}) - strftime('%s', acquired_at)) <= 120
        )
        ON CONFLICT(shard_id) DO UPDATE
        SET address = ${address}, acquired_at = ${sqlNow}
      `
  })

  const forUpdate = sql.onDialectOrElse({
    sqlite: () => sql.literal(""),
    orElse: () => sql.literal("FOR UPDATE")
  })

  return yield* ShardStorage.makeEncoded({
    getAssignments: sql`SELECT shard_id, address FROM ${shardsTableSql} ORDER BY shard_id`.values.pipe(
      PersistenceError.refail
    ) as any,

    saveAssignments: (assignments) => {
      const remove = sql`DELETE FROM ${shardsTableSql}`
      if (assignments.length === 0) {
        return PersistenceError.refail(remove)
      }
      const values = assignments.map(([shardId, address]) => sql`(${shardId}, ${address})`)
      return remove.pipe(
        Effect.andThen(sql`INSERT INTO ${shardsTableSql} (shard_id, address) VALUES ${sql.csv(values)}`.unprepared),
        sql.withTransaction,
        PersistenceError.refail
      )
    },

    getRunners: sql`SELECT address, runner FROM ${runnersTableSql}`.values.pipe(
      PersistenceError.refail,
      Effect.map(Arr.map(([address, runner]) => [String(address), String(runner)] as const))
    ),

    saveRunners: (runners) => {
      const remove = sql`DELETE FROM ${runnersTableSql}`
      if (runners.length === 0) {
        return PersistenceError.refail(remove)
      }
      const values = runners.map(([address, runner]) => sql`(${address}, ${runner})`)
      const insert = sql`INSERT INTO ${runnersTableSql} (address, runner) VALUES ${sql.csv(values)}`.unprepared
      return remove.pipe(
        Effect.andThen(insert),
        sql.withTransaction,
        PersistenceError.refail
      )
    },

    acquire: Effect.fnUntraced(
      function*(address, shardIds) {
        const values = shardIds.map((shardId) => sql`(${shardId}, ${address}, ${sqlNow})`)
        yield* acquireLock(address, values)
        const currentLocks = yield* sql<{ shard_id: number }>`
          SELECT shard_id FROM ${sql(locksTable)}
          WHERE address = ${address} AND ${sql.in("shard_id", shardIds)}
          ${forUpdate}
        `
        return currentLocks.map((row) => row.shard_id)
      },
      sql.withTransaction,
      PersistenceError.refail
    ),

    refresh: (address, shardIds) =>
      sql`UPDATE ${locksTableSql} SET acquired_at = ${sqlNow} WHERE address = ${address} AND ${
        sql.in("shard_id", shardIds)
      }`.pipe(
        Effect.andThen(
          sql`SELECT shard_id FROM ${locksTableSql} WHERE address = ${address} AND acquired_at >= ${lockExpiresAt} ${forUpdate}`
            .values
        ),
        Effect.map((rows) => rows.map((row) => Number(row[0]))),
        PersistenceError.refail
      ),

    release: (address, shardId) =>
      sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`
        .pipe(PersistenceError.refail),

    releaseAll: (address) =>
      sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`.pipe(
        PersistenceError.refail
      )
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  ShardStorage.ShardStorage,
  SqlError,
  SqlClient.SqlClient
> = Layer.effect(ShardStorage.ShardStorage, make())

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWith = (options: {
  readonly prefix?: string | undefined
}): Layer.Layer<ShardStorage.ShardStorage, SqlError, SqlClient.SqlClient> =>
  Layer.scoped(ShardStorage.ShardStorage, make(options))
