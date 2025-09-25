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

const withTracerDisabled = Effect.withTracerEnabled(false)

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
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255)
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${shardsTableSql} (
          shard_id TEXT PRIMARY KEY,
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
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at DATETIME NOT NULL
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at DATETIME NOT NULL
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id VARCHAR(50) PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          acquired_at TIMESTAMP NOT NULL
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${locksTableSql} (
          shard_id TEXT PRIMARY KEY,
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
    pg: () => sql`${sqlNow} - INTERVAL '5 seconds'`,
    mysql: () => sql`DATE_SUB(${sqlNow}, INTERVAL 5 SECOND)`,
    mssql: () => sql`DATEADD(SECOND, -5, ${sqlNow})`,
    orElse: () => sql`datetime(${sqlNow}, '-5 seconds')`
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
        WHEN MATCHED AND (target.address = source.address OR DATEDIFF(SECOND, target.acquired_at, ${sqlNow}) > 5) THEN
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
          AND (strftime('%s', ${sqlNow}) - strftime('%s', acquired_at)) <= 5
        )
        ON CONFLICT(shard_id) DO UPDATE
        SET address = ${address}, acquired_at = ${sqlNow}
      `
  })

  const wrapString = sql.onDialectOrElse({
    mssql: () => (s: string) => `N'${s}'`,
    orElse: () => (s: string) => `'${s}'`
  })
  const wrapStringArr = (arr: ReadonlyArray<string>) => sql.literal(arr.map(wrapString).join(", "))

  const refreshShards = sql.onDialectOrElse({
    mysql: () => (address: string, shardIds: ReadonlyArray<string>) => {
      const shardIdsStr = wrapStringArr(shardIds)
      return sql<Array<{ shard_id: string }>>`
        UPDATE ${locksTableSql}
        SET acquired_at = ${sqlNow}
        WHERE address = ${address} AND shard_id IN (${shardIdsStr});
        SELECT shard_id FROM ${locksTableSql} WHERE address = ${address} AND shard_id IN (${shardIdsStr})
      `.unprepared.pipe(
        Effect.map((rows) => rows[1].map((row) => [row.shard_id]))
      )
    },
    mssql: () => (address: string, shardIds: ReadonlyArray<string>) =>
      sql`
        UPDATE ${locksTableSql}
        SET acquired_at = ${sqlNow}
        OUTPUT inserted.shard_id
        WHERE address = ${address} AND shard_id IN (${wrapStringArr(shardIds)})
      `.values,
    orElse: () => (address: string, shardIds: ReadonlyArray<string>) =>
      sql`
        UPDATE ${locksTableSql}
        SET acquired_at = ${sqlNow}
        WHERE address = ${address} AND shard_id IN (${wrapStringArr(shardIds)})
        RETURNING shard_id
      `.values
  })

  return ShardStorage.makeEncoded({
    getAssignments: sql`SELECT shard_id, address FROM ${shardsTableSql} ORDER BY shard_id`.values.pipe(
      PersistenceError.refail,
      withTracerDisabled
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
        PersistenceError.refail,
        withTracerDisabled
      )
    },

    getRunners: sql`SELECT address, runner FROM ${runnersTableSql}`.values.pipe(
      PersistenceError.refail,
      Effect.map(Arr.map(([address, runner]) => [String(address), String(runner)] as const)),
      withTracerDisabled
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
        PersistenceError.refail,
        withTracerDisabled
      )
    },

    acquire: Effect.fnUntraced(
      function*(address, shardIds) {
        if (shardIds.length > 0) {
          const values = shardIds.map((shardId) => sql`(${shardId}, ${address}, ${sqlNow})`)
          yield* acquireLock(address, values)
        }
        const currentLocks = yield* sql<{ shard_id: string }>`
          SELECT shard_id FROM ${sql(locksTable)}
          WHERE address = ${address} AND acquired_at >= ${lockExpiresAt}
        `.values
        return currentLocks.map((row) => row[0] as string)
      },
      sql.withTransaction,
      PersistenceError.refail,
      withTracerDisabled
    ),

    refresh: (address, shardIds) =>
      shardIds.length === 0
        ? Effect.succeed([])
        : refreshShards(address, shardIds).pipe(
          Effect.map((rows) => rows.map((row) => row[0] as string)),
          PersistenceError.refail,
          withTracerDisabled
        ),

    release: (address, shardId) =>
      sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`.pipe(
        PersistenceError.refail,
        withTracerDisabled
      ),

    releaseAll: (address) =>
      sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`.pipe(
        PersistenceError.refail,
        withTracerDisabled
      )
  })
}, withTracerDisabled)

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
