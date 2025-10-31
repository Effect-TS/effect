/**
 * @since 1.0.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type * as Statement from "@effect/sql/Statement"
import * as Arr from "effect/Array"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ScopedRef from "effect/ScopedRef"
import { PersistenceError } from "./ClusterError.js"
import * as RunnerStorage from "./RunnerStorage.js"
import * as ShardId from "./ShardId.js"
import * as ShardingConfig from "./ShardingConfig.js"

const withTracerDisabled = Effect.withTracerEnabled(false)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly prefix?: string | undefined
}) {
  const config = yield* ShardingConfig.ShardingConfig
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const prefix = options?.prefix ?? "cluster"
  const table = (name: string) => `${prefix}_${name}`
  const lockConnRef = yield* sql.onDialectOrElse({
    sqlite: () => Effect.void,

    orElse: () => ScopedRef.fromAcquire(sql.reserve)
  })

  const runnersTable = table("runners")
  const runnersTableSql = sql(runnersTable)

  // Migrate old tables if they exist
  // TODO: Remove in next major version
  const hasOldTables = yield* sql`SELECT shard_id FROM ${sql(table("shards"))} LIMIT 1`.pipe(
    Effect.isSuccess
  )
  if (hasOldTables) {
    yield* sql`DROP TABLE ${sql(table("shards"))}`.pipe(Effect.ignore)
    yield* sql`DROP TABLE ${runnersTableSql}`.pipe(Effect.ignore)
  }

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`
        IF OBJECT_ID(N'${runnersTableSql}', N'U') IS NULL
        CREATE TABLE ${runnersTableSql} (
          machine_id INT IDENTITY PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          runner TEXT NOT NULL,
          healthy BIT NOT NULL DEFAULT 1,
          last_heartbeat DATETIME NOT NULL DEFAULT GETDATE(),
          UNIQUE(address)
        )
      `,
    mysql: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          machine_id INT AUTO_INCREMENT PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          runner TEXT NOT NULL,
          healthy BOOLEAN NOT NULL DEFAULT TRUE,
          last_heartbeat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(address)
        )
      `,
    pg: () =>
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          machine_id SERIAL PRIMARY KEY,
          address VARCHAR(255) NOT NULL,
          runner TEXT NOT NULL,
          healthy BOOLEAN NOT NULL DEFAULT TRUE,
          last_heartbeat TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(address)
        )
      `,
    orElse: () =>
      // sqlite
      sql`
        CREATE TABLE IF NOT EXISTS ${runnersTableSql} (
          machine_id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT NOT NULL,
          runner TEXT NOT NULL,
          healthy INTEGER NOT NULL DEFAULT 1,
          last_heartbeat DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          UNIQUE(address)
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
    mysql: () => Effect.void,
    pg: () => Effect.void,
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

  const expiresSeconds = sql.literal(Math.ceil(Duration.toSeconds(config.shardLockExpiration)).toString())
  const lockExpiresAt = sql.onDialectOrElse({
    pg: () => sql`${sqlNow} - INTERVAL '${expiresSeconds} seconds'`,
    mysql: () => sql`DATE_SUB(${sqlNow}, INTERVAL ${expiresSeconds} SECOND)`,
    mssql: () => sql`DATEADD(SECOND, -${expiresSeconds}, ${sqlNow})`,
    orElse: () => sql`datetime(${sqlNow}, '-${expiresSeconds} seconds')`
  })

  const encodeBoolean = sql.onDialectOrElse({
    mssql: () => (b: boolean) => (b ? 1 : 0),
    sqlite: () => (b: boolean) => (b ? 1 : 0),
    orElse: () => (b: boolean) => b
  })

  // Upsert runner and return machine_id
  const insertRunner = sql.onDialectOrElse({
    mssql: () => (address: string, runner: string, healthy: boolean) =>
      sql`
        MERGE ${runnersTableSql} AS target
        USING (SELECT ${address} AS address, ${runner} AS runner, ${sqlNow} AS last_heartbeat, ${
        encodeBoolean(healthy)
      } AS healthy) AS source
        ON target.address = source.address
        WHEN MATCHED THEN
          UPDATE SET runner = source.runner, last_heartbeat = source.last_heartbeat, healthy = source.healthy
        WHEN NOT MATCHED THEN
          INSERT (address, runner, last_heartbeat, healthy)
          VALUES (source.address, source.runner, source.last_heartbeat, source.healthy)
        OUTPUT INSERTED.machine_id;
      `.values,
    mysql: () => (address: string, runner: string, healthy: boolean) =>
      sql<{ machine_id: number }>`
        INSERT INTO ${runnersTableSql} (address, runner, last_heartbeat, healthy)
        VALUES (${address}, ${runner}, ${sqlNow}, ${healthy})
        ON DUPLICATE KEY UPDATE
          runner = VALUES(runner),
          last_heartbeat = VALUES(last_heartbeat),
          healthy = VALUES(healthy);
        SELECT machine_id FROM ${runnersTableSql} WHERE address = ${address};
      `.unprepared.pipe(
        Effect.map((results: any) => [[results[1][0].machine_id]])
      ),
    pg: () => (address: string, runner: string, healthy: boolean) =>
      sql`
        INSERT INTO ${runnersTableSql} (address, runner, last_heartbeat, healthy)
        VALUES (${address}, ${runner}, ${sqlNow}, ${healthy})
        ON CONFLICT (address) DO UPDATE
        SET runner = EXCLUDED.runner,
            last_heartbeat = EXCLUDED.last_heartbeat,
            healthy = EXCLUDED.healthy
        RETURNING machine_id
      `.values,
    orElse: () => (address: string, runner: string, healthy: boolean) =>
      // sqlite
      sql`
        INSERT INTO ${runnersTableSql} (address, runner, last_heartbeat, healthy)
        VALUES (${address}, ${runner}, ${sqlNow}, ${encodeBoolean(healthy)})
        ON CONFLICT(address) DO UPDATE SET
          runner = excluded.runner,
          last_heartbeat = excluded.last_heartbeat,
          healthy = excluded.healthy
        RETURNING machine_id;
      `.values
  })

  const execWithLockConn = <A>(effect: Statement.Statement<A>): Effect.Effect<unknown, SqlError> => {
    if (!lockConnRef) return effect
    const [query, params] = effect.compile()
    return ScopedRef.get(lockConnRef).pipe(
      Effect.flatMap((conn) => conn.executeRaw(query, params)),
      Effect.onError(() => resetLockConn)
    )
  }
  const execWithLockConnValues = <A>(
    effect: Statement.Statement<A>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<any>>, SqlError> => {
    if (!lockConnRef) return effect.values
    const [query, params] = effect.compile()
    return ScopedRef.get(lockConnRef).pipe(
      Effect.flatMap((conn) => conn.executeValues(query, params)),
      Effect.onError(() => resetLockConn)
    )
  }
  const resetLockConn = sql.onDialectOrElse({
    pg: () =>
      Effect.gen(function*() {
        const conn = yield* ScopedRef.get(lockConnRef!)
        yield* Effect.ignore(conn.executeRaw("SELECT pg_advisory_unlock_all()", []))
        yield* Effect.orDie(ScopedRef.set(lockConnRef!, sql.reserve))
      }),
    mysql: () =>
      Effect.gen(function*() {
        const conn = yield* ScopedRef.get(lockConnRef!)
        yield* Effect.ignore(conn.executeRaw("SELECT RELEASE_ALL_LOCKS()", []))
        yield* Effect.orDie(ScopedRef.set(lockConnRef!, sql.reserve))
      }),
    orElse: () => Effect.void
  })

  const acquireLock = sql.onDialectOrElse({
    pg: () =>
      Effect.fnUntraced(function*(_address: string, shardIds: ReadonlyArray<string>) {
        const conn = yield* ScopedRef.get(lockConnRef!)
        const acquiredShardIds: Array<string> = []
        const toAcquire = new Map(shardIds.map((shardId) => [lockNumbers.get(shardId)!, shardId]))
        const takenLocks = yield* conn.executeValues(
          `SELECT objid FROM pg_locks WHERE locktype = 'advisory' AND granted = true AND pid = pg_backend_pid() ORDER BY objid`,
          []
        )
        for (let i = 0; i < takenLocks.length; i++) {
          const lockNum = takenLocks[i][0] as number
          acquiredShardIds.push(lockNumbersReverse.get(lockNum)!)
          toAcquire.delete(lockNum)
        }
        if (toAcquire.size === 0) {
          return acquiredShardIds
        }
        const results = (yield* conn.executeUnprepared(`SELECT ${pgLocks(toAcquire)}`, [], undefined))[0] as Record<
          string,
          boolean
        >
        for (const shardId in results) {
          if (results[shardId]) {
            acquiredShardIds.push(shardId)
          }
        }
        return acquiredShardIds
      }, Effect.onError(() => resetLockConn)),

    mysql: () =>
      Effect.fnUntraced(function*(_address: string, shardIds: ReadonlyArray<string>) {
        const conn = yield* ScopedRef.get(lockConnRef!)
        const takenLocks = (yield* conn.executeUnprepared(`SELECT ${allMySqlTakenLocks}`, [], undefined))[0] as Record<
          string,
          1 | null
        >
        const acquiredShardIds: Array<string> = []
        const toAcquire: Array<string> = []
        for (const shardId in takenLocks) {
          if (takenLocks[shardId] === 1) {
            acquiredShardIds.push(shardId)
          } else if (shardIds.includes(shardId)) {
            toAcquire.push(shardId)
          }
        }
        if (toAcquire.length === 0) {
          return acquiredShardIds
        }
        const results = (yield* conn.executeUnprepared(`SELECT ${mysqlLocks(toAcquire)}`, [], undefined))[0] as Record<
          string,
          number
        >
        for (const shardId in results) {
          if (results[shardId] === 1) {
            acquiredShardIds.push(shardId)
          }
        }
        return acquiredShardIds
      }, Effect.onError(() => resetLockConn)),

    mssql: () => (address: string, shardIds: ReadonlyArray<string>) => {
      const values = shardIds.map((shardId) => sql`(${stringLiteral(shardId)}, ${stringLiteral(address)}, ${sqlNow})`)
      return sql`
        MERGE ${locksTableSql} WITH (HOLDLOCK) AS target
        USING (SELECT * FROM (VALUES ${sql.csv(values)})) AS source (shard_id, address, acquired_at)
        ON target.shard_id = source.shard_id
        WHEN MATCHED AND (target.address = source.address OR DATEDIFF(SECOND, target.acquired_at, ${sqlNow}) > ${expiresSeconds}) THEN
          UPDATE SET address = source.address, acquired_at = source.acquired_at
        WHEN NOT MATCHED THEN
          INSERT (shard_id, address, acquired_at)
          VALUES (source.shard_id, source.address, source.acquired_at);
      `.pipe(
        Effect.andThen(acquiredLocks(address, shardIds)),
        sql.withTransaction
      )
    },

    orElse: () => (address: string, shardIds: ReadonlyArray<string>) => {
      const values = shardIds.map((shardId) => sql`(${stringLiteral(shardId)}, ${stringLiteral(address)}, ${sqlNow})`)
      return sql`
        WITH source(shard_id, address, acquired_at) AS (VALUES ${sql.csv(values)})
        INSERT INTO ${locksTableSql} (shard_id, address, acquired_at)
        SELECT source.shard_id, source.address, source.acquired_at
        FROM source
        WHERE NOT EXISTS (
          SELECT 1 FROM ${locksTableSql}
          WHERE shard_id = source.shard_id
          AND address != ${address}
          AND (strftime('%s', ${sqlNow}) - strftime('%s', acquired_at)) <= ${expiresSeconds}
        )
        ON CONFLICT(shard_id) DO UPDATE
        SET address = ${address}, acquired_at = ${sqlNow}
      `.pipe(
        Effect.andThen(acquiredLocks(address, shardIds)),
        sql.withTransaction
      )
    }
  })

  const lockNumbers = new Map<string, number>()
  const lockNumbersReverse = new Map<number, string>()
  for (let i = 0; i < config.shardGroups.length; i++) {
    const group = config.shardGroups[i]
    const base = (i + 1) * 1000000
    for (let shard = 1; shard <= config.shardsPerGroup; shard++) {
      const shardId = ShardId.make(group, shard).toString()
      const lockNum = base + shard
      lockNumbers.set(shardId, lockNum)
      lockNumbersReverse.set(lockNum, shardId)
    }
  }

  const lockNames = new Map<string, string>()
  const lockNamesReverse = new Map<string, string>()
  for (let i = 0; i < config.shardGroups.length; i++) {
    const group = config.shardGroups[i]
    for (let shard = 1; shard <= config.shardsPerGroup; shard++) {
      const shardId = ShardId.make(group, shard).toString()
      const lockName = `${prefix}.${shardId}`
      lockNames.set(shardId, lockName)
      lockNamesReverse.set(lockName, shardId)
    }
  }

  const pgLocks = (shardIdsMap: Map<number, string>) =>
    Array.from(
      shardIdsMap.entries(),
      ([lockNum, shardId]) => `pg_try_advisory_lock(${lockNum}) AS "${shardId}"`
    ).join(", ")

  const mysqlLocks = (shardIds: ReadonlyArray<string>) =>
    shardIds.map((shardId) => `GET_LOCK('${lockNames.get(shardId)!}', 0) AS "${shardId}"`).join(", ")

  const allMySqlTakenLocks = Array.from(
    lockNames.entries(),
    ([shardId, lockName]) => `IS_USED_LOCK('${lockName}') = CONNECTION_ID() AS "${shardId}"`
  ).join(", ")

  const acquiredLocks = (address: string, shardIds: ReadonlyArray<string>) =>
    sql<{ shard_id: string }>`
      SELECT shard_id FROM ${sql(locksTable)}
      WHERE address = ${address}
      AND acquired_at >= ${lockExpiresAt}
      AND shard_id IN ${stringLiteralArr(shardIds)}
    `.values.pipe(
      Effect.map((rows) => rows.map((row) => row[0] as string))
    )

  const wrapString = sql.onDialectOrElse({
    mssql: () => (s: string) => `N'${s}'`,
    orElse: () => (s: string) => `'${s}'`
  })
  const stringLiteral = (s: string) => sql.literal(wrapString(s))
  const stringLiteralArr = (arr: ReadonlyArray<string>) => sql.literal(`(${arr.map(wrapString).join(",")})`)

  const refreshShards = sql.onDialectOrElse({
    pg: () => acquireLock,
    mysql: () => acquireLock,
    mssql: () => (address: string, shardIds: ReadonlyArray<string>) =>
      sql`
        UPDATE ${locksTableSql}
        SET acquired_at = ${sqlNow}
        OUTPUT inserted.shard_id
        WHERE address = ${address} AND shard_id IN ${stringLiteralArr(shardIds)}
      `.pipe(execWithLockConnValues, Effect.map((rows) => rows.map((row) => row[0] as string))),
    orElse: () => (address: string, shardIds: ReadonlyArray<string>) =>
      sql`
        UPDATE ${locksTableSql}
        SET acquired_at = ${sqlNow}
        WHERE address = ${address} AND shard_id IN ${stringLiteralArr(shardIds)}
        RETURNING shard_id
      `.pipe(execWithLockConnValues, Effect.map((rows) => rows.map((row) => row[0] as string)))
  })

  return RunnerStorage.makeEncoded({
    getRunners: sql`SELECT runner, healthy FROM ${runnersTableSql} WHERE last_heartbeat > ${lockExpiresAt}`.values.pipe(
      PersistenceError.refail,
      Effect.map(Arr.map(([runner, healthy]) => [String(runner), Boolean(healthy)] as const)),
      withTracerDisabled
    ),

    register: (address, runner, healthy) =>
      insertRunner(address, runner, healthy).pipe(
        Effect.map((rows: any) => Number(rows[0][0])),
        PersistenceError.refail,
        withTracerDisabled
      ),

    unregister: (address) =>
      sql`DELETE FROM ${runnersTableSql} WHERE address = ${address} OR last_heartbeat < ${lockExpiresAt}`.pipe(
        Effect.asVoid,
        PersistenceError.refail,
        withTracerDisabled
      ),

    setRunnerHealth: (address, healthy) =>
      sql`UPDATE ${runnersTableSql} SET healthy = ${encodeBoolean(healthy)} WHERE address = ${address}`
        .pipe(
          Effect.asVoid,
          PersistenceError.refail,
          withTracerDisabled
        ),

    acquire: (address, shardIds) =>
      acquireLock(address, shardIds).pipe(
        PersistenceError.refail,
        withTracerDisabled
      ),

    refresh: (address, shardIds) =>
      sql`UPDATE ${runnersTableSql} SET last_heartbeat = ${sqlNow} WHERE address = ${address}`.pipe(
        execWithLockConn,
        shardIds.length > 0 ?
          Effect.andThen(refreshShards(address, shardIds)) :
          Effect.as([]),
        PersistenceError.refail
      ),

    release: sql.onDialectOrElse({
      pg: () =>
        Effect.fnUntraced(
          function*(_address, shardId) {
            const lockNum = lockNumbers.get(shardId)!
            const conn = yield* ScopedRef.get(lockConnRef!)
            const release = conn.executeRaw(`SELECT pg_advisory_unlock(${lockNum})`, [])
            const check = conn.executeValues(
              `SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND granted = true AND pid = pg_backend_pid() AND objid = ${lockNum}`,
              []
            )
            while (true) {
              yield* release
              const takenLocks = yield* check
              if (takenLocks.length === 0) return
            }
          },
          Effect.onError(() => resetLockConn),
          Effect.asVoid,
          PersistenceError.refail,
          withTracerDisabled
        ),
      mysql: () =>
        Effect.fnUntraced(
          function*(_address, shardId) {
            const conn = yield* ScopedRef.get(lockConnRef!)
            const lockName = lockNames.get(shardId)!
            const release = conn.executeRaw(`SELECT RELEASE_LOCK('${lockName}')`, [])
            const check = conn.executeValues(
              `SELECT IS_USED_LOCK('${lockName}') = CONNECTION_ID() AS is_taken`,
              []
            )
            while (true) {
              yield* release
              const takenLocks = yield* check
              if (takenLocks.length === 0 || takenLocks[0][0] !== 1) return
            }
          },
          Effect.onError(() => resetLockConn),
          Effect.asVoid,
          PersistenceError.refail,
          withTracerDisabled
        ),
      orElse: () => (address, shardId) =>
        sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`.pipe(
          PersistenceError.refail,
          withTracerDisabled
        )
    }),

    releaseAll: sql.onDialectOrElse({
      pg: () => (_address) =>
        sql`SELECT pg_advisory_unlock_all()`.pipe(
          execWithLockConn,
          Effect.asVoid,
          PersistenceError.refail,
          withTracerDisabled
        ),
      mysql: () => (_address) =>
        sql`SELECT RELEASE_ALL_LOCKS()`.pipe(
          execWithLockConn,
          Effect.asVoid,
          PersistenceError.refail,
          withTracerDisabled
        ),
      orElse: () => (address) =>
        sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`.pipe(
          PersistenceError.refail,
          withTracerDisabled
        )
    })
  })
}, withTracerDisabled)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer: Layer.Layer<
  RunnerStorage.RunnerStorage,
  SqlError,
  SqlClient.SqlClient | ShardingConfig.ShardingConfig
> = Layer.scoped(RunnerStorage.RunnerStorage)(make({}))

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerWith = (options: {
  readonly prefix?: string | undefined
}): Layer.Layer<RunnerStorage.RunnerStorage, SqlError, SqlClient.SqlClient | ShardingConfig.ShardingConfig> =>
  Layer.scoped(RunnerStorage.RunnerStorage)(make(options))
