/**
 * @since 1.0.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type * as Statement from "@effect/sql/Statement"
import * as Arr from "effect/Array"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import { PersistenceError } from "./ClusterError.js"
import { ResourceRef } from "./internal/resourceRef.js"
import { effectiveInterval } from "./internal/shardLock.js"
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
  const shardGroups = ShardingConfig.shardGroupConfig(config)
  const availableShardGroups = Array.from(shardGroups.available)
  const disableAdvisoryLocks = config.shardLockDisableAdvisory
  const lockOperationInterval = effectiveInterval(config)
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const layerScope = yield* Effect.scope
  const prefix = options?.prefix ?? "cluster"
  const table = (name: string) => `${prefix}_${name}`

  // Keep all PostgreSQL and MySQL shard-lock operations on a rebuildable
  // reserved connection, including when advisory locks are disabled.
  const acquireLockConn = sql.onDialectOrElse({
    pg: () =>
      Effect.fnUntraced(function*(scope: Scope.Scope) {
        const conn = yield* Effect.orDie(sql.reserve).pipe(
          Scope.extend(scope)
        )
        const pid = disableAdvisoryLocks
          ? 0
          : (yield* conn.executeValues("SELECT pg_backend_pid()", []))[0][0] as number
        if (!disableAdvisoryLocks) {
          yield* Scope.addFinalizerExit(scope, () =>
            conn.executeRaw("SELECT pg_advisory_unlock_all()", []).pipe(
              Effect.timeout(lockOperationInterval),
              Effect.interruptible,
              Effect.catchAllCause(() => Effect.void)
            ))
        }
        return [conn, pid] as const
      }, Effect.orDie),
    mysql: () =>
      Effect.fnUntraced(function*(scope: Scope.Scope) {
        const conn = yield* Effect.orDie(sql.reserve).pipe(
          Scope.extend(scope)
        )
        if (disableAdvisoryLocks) return [conn, 0] as const
        // we need to get the connection id using IS_USED_LOCK to properly
        // support vitess
        let pid: number | undefined = undefined
        while (pid === undefined) {
          const address = `cluster:pid:${(Math.random() * Number.MAX_SAFE_INTEGER) | 0}`
          const taken = (yield* conn.executeValues(
            `SELECT GET_LOCK('${address}', 10), IS_USED_LOCK('${address}')`,
            []
          ))[0] as [1 | null, number]
          if (taken[0] === null) continue
          pid = taken[1]
        }
        yield* Scope.addFinalizerExit(scope, () =>
          conn.executeRaw("SELECT RELEASE_ALL_LOCKS()", []).pipe(
            Effect.timeout(lockOperationInterval),
            Effect.interruptible,
            Effect.catchAllCause(() => Effect.void)
          ))
        return [conn, pid] as const
      }, Effect.orDie),
    orElse: () => undefined
  })
  const lockConn = acquireLockConn && (yield* ResourceRef.from(layerScope, acquireLockConn))

  // Timeout the join rather than the operation so stalled interruption and
  // cleanup can finish detached in the layer scope.
  const withDeadline = Effect.fnUntraced(function*<A, E, R>(operation: Effect.Effect<A, E, R>) {
    const fiber = yield* Effect.forkIn(operation, layerScope)
    return yield* Fiber.join(fiber).pipe(
      Effect.timeout(lockOperationInterval),
      Effect.ensuring(Effect.suspend(() =>
        fiber.unsafePoll() !== null ? Effect.void : Fiber.interrupt(fiber).pipe(
          Effect.forkIn(layerScope),
          Effect.asVoid
        )
      ))
    )
  })

  let lockConnRebuilding = false
  let lockConnGeneration = 0
  const rebuildLockConn = (generation: number) => {
    if (
      !lockConn ||
      lockConnRebuilding ||
      generation !== lockConnGeneration ||
      lockConn.state.current._tag === "Closed"
    ) return Effect.void
    lockConnRebuilding = true
    return withDeadline(lockConn.unsafeRebuild()).pipe(
      Effect.exit,
      Effect.tap((exit) =>
        Effect.sync(() => {
          if (Exit.isSuccess(exit) && lockConn.state.current._tag === "Acquired") {
            lockConnGeneration++
          }
        })
      ),
      Effect.ensuring(Effect.sync(() => {
        lockConnRebuilding = false
      })),
      Effect.forkIn(layerScope),
      Effect.asVoid
    )
  }
  const onErrorRebuildLockConn = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.suspend(() => {
      const generation = lockConnGeneration
      return Effect.onError(effect, () => rebuildLockConn(generation))
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
    mysql: () =>
      disableAdvisoryLocks
        ? sql`
          CREATE TABLE IF NOT EXISTS ${locksTableSql} (
            shard_id VARCHAR(50) PRIMARY KEY,
            address VARCHAR(255) NOT NULL,
            acquired_at DATETIME NOT NULL
          )
        `
        : Effect.void,
    pg: () =>
      disableAdvisoryLocks
        ? sql`
          CREATE TABLE IF NOT EXISTS ${locksTableSql} (
            shard_id VARCHAR(50) PRIMARY KEY,
            address VARCHAR(255) NOT NULL,
            acquired_at TIMESTAMP NOT NULL
          )
        `
        : Effect.void,
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
    if (!lockConn) return effect
    const [query, params] = effect.compile()
    return lockConn.await.pipe(
      Effect.flatMap(([conn]) => conn.executeRaw(query, params)),
      onErrorRebuildLockConn
    )
  }
  const execWithLockConnUnprepared = <A>(
    effect: Statement.Statement<A>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<any>>, SqlError> => {
    if (!lockConn) return effect.values
    const [query, params] = effect.compile()
    return lockConn.await.pipe(
      Effect.flatMap(([conn]) => conn.executeUnprepared(query, params, undefined)),
      onErrorRebuildLockConn
    )
  }
  const execWithLockConnValues = <A>(
    effect: Statement.Statement<A>
  ): Effect.Effect<ReadonlyArray<ReadonlyArray<any>>, SqlError> => {
    if (!lockConn) return effect.values
    const [query, params] = effect.compile()
    return lockConn.await.pipe(
      Effect.flatMap(([conn]) => conn.executeValues(query, params)),
      onErrorRebuildLockConn
    )
  }

  const acquireLock = sql.onDialectOrElse({
    pg: () => {
      if (disableAdvisoryLocks) {
        return (address: string, shardIds: ReadonlyArray<string>) => {
          const values = shardIds.map((shardId) =>
            sql`(${stringLiteral(shardId)}, ${stringLiteral(address)}, ${sqlNow})`
          )
          return sql`
            INSERT INTO ${locksTableSql} (shard_id, address, acquired_at) VALUES ${sql.csv(values)}
            ON CONFLICT (shard_id) DO UPDATE
            SET address = ${address}, acquired_at = ${sqlNow}
            WHERE ${locksTableSql}.address = ${address}
              OR ${locksTableSql}.acquired_at < ${lockExpiresAt}
`.pipe(
            execWithLockConn,
            Effect.andThen(acquiredLocks(address, shardIds))
          )
        }
      }
      return Effect.fnUntraced(function*(_address: string, shardIds: ReadonlyArray<string>) {
        const [conn, pid] = yield* lockConn!.await
        const acquiredShardIds: Array<string> = []
        const toAcquire = new Map(shardIds.map((shardId) => [lockNumbers.get(shardId)!, shardId]))
        const takenLocks = yield* conn.executeValues(
          `SELECT objid FROM pg_locks WHERE locktype = 'advisory' AND granted = true AND pid = ${pid} ORDER BY objid`,
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
        const rows = yield* conn.executeUnprepared(`SELECT ${pgLocks(toAcquire)}`, [], undefined)
        const results = rows[0] as Record<string, boolean>
        for (const shardId in results) {
          if (results[shardId]) {
            acquiredShardIds.push(shardId)
          }
        }
        return acquiredShardIds
      }, onErrorRebuildLockConn)
    },

    mysql: () => {
      if (disableAdvisoryLocks) {
        return (address: string, shardIds: ReadonlyArray<string>) => {
          const values = shardIds.map((shardId) =>
            sql`(${stringLiteral(shardId)}, ${stringLiteral(address)}, ${sqlNow})`
          )
          return sql`
            INSERT INTO ${locksTableSql} (shard_id, address, acquired_at) VALUES ${sql.csv(values)}
            ON DUPLICATE KEY UPDATE
            address = IF(address = VALUES(address) OR acquired_at < ${lockExpiresAt}, VALUES(address), address),
            acquired_at = IF(address = VALUES(address) OR acquired_at < ${lockExpiresAt}, VALUES(acquired_at), acquired_at)
`.pipe(
            execWithLockConnUnprepared,
            Effect.andThen(acquiredLocks(address, shardIds))
          )
        }
      }
      return Effect.fnUntraced(function*(_address: string, shardIds: ReadonlyArray<string>) {
        const [conn, pid] = yield* lockConn!.await
        const takenLocks = (yield* conn.executeValues(`SELECT ${allMySqlTakenLocks}`, []))[0] as Array<number | null>
        const acquiredShardIds: Array<string> = []
        const toAcquire: Array<string> = []
        for (let i = 0; i < shardIds.length; i++) {
          const shardId = shardIds[i]
          const lockTakenBy = takenLocks[shardIdsIndex.get(shardId)!]
          if (lockTakenBy === pid) {
            acquiredShardIds.push(shardId)
          } else if (shardIds.includes(shardId)) {
            toAcquire.push(shardId)
          }
        }
        if (toAcquire.length === 0) {
          return acquiredShardIds
        }
        const results = (yield* conn.executeValues(`SELECT ${mysqlLocks(toAcquire)}`, []))[0] as Array<number>
        for (let i = 0; i < results.length; i++) {
          if (results[i] === 1) {
            acquiredShardIds.push(toAcquire[i])
          }
        }
        return acquiredShardIds
      }, onErrorRebuildLockConn)
    },

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
  for (let i = 0; i < availableShardGroups.length; i++) {
    const group = availableShardGroups[i]
    const base = (i + 1) * 1000000
    for (let shard = 1; shard <= config.shardsPerGroup; shard++) {
      const shardId = ShardId.make(group, shard).toString()
      const lockNum = base + shard
      lockNumbers.set(shardId, lockNum)
      lockNumbersReverse.set(lockNum, shardId)
    }
  }

  const shardIdsIndex = new Map<string, number>()
  const lockNames = new Map<string, string>()
  const lockNamesReverse = new Map<string, string>()
  {
    let index = 0
    for (let i = 0; i < availableShardGroups.length; i++) {
      const group = availableShardGroups[i]
      for (let shard = 1; shard <= config.shardsPerGroup; shard++) {
        const shardId = ShardId.make(group, shard).toString()
        const lockName = `${prefix}.${shardId}`
        shardIdsIndex.set(shardId, index++)
        lockNames.set(shardId, lockName)
        lockNamesReverse.set(lockName, shardId)
      }
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
    ([shardId, lockName]) => `IS_USED_LOCK('${lockName}') AS "${shardId}"`
  ).join(", ")

  const acquiredLocks = (address: string, shardIds: ReadonlyArray<string>) =>
    sql<{ shard_id: string }>`
      SELECT shard_id FROM ${sql(locksTable)}
      WHERE address = ${address}
      AND acquired_at >= ${lockExpiresAt}
      AND shard_id IN ${stringLiteralArr(shardIds)}
    `.pipe(
      execWithLockConnValues,
      Effect.map((rows) => rows.map((row) => row[0] as string))
    )

  const wrapString = sql.onDialectOrElse({
    mssql: () => (s: string) => `N'${s}'`,
    orElse: () => (s: string) => `'${s}'`
  })
  const stringLiteral = (s: string) => sql.literal(wrapString(s))
  const stringLiteralArr = (arr: ReadonlyArray<string>) => sql.literal(`(${arr.map(wrapString).join(",")})`)

  const refreshShards = sql.onDialectOrElse({
    pg: () => {
      if (!disableAdvisoryLocks) return acquireLock
      return (address: string, shardIds: ReadonlyArray<string>) =>
        sql`
          UPDATE ${locksTableSql}
          SET acquired_at = ${sqlNow}
          WHERE address = ${address} AND shard_id IN ${stringLiteralArr(shardIds)}
          RETURNING shard_id
        `.pipe(
          execWithLockConnValues,
          Effect.map((rows) => rows.map((row) => row[0] as string))
        )
    },
    mysql: () => {
      if (!disableAdvisoryLocks) return acquireLock
      return (address: string, shardIds: ReadonlyArray<string>) => {
        const shardIdsStr = stringLiteralArr(shardIds)
        return sql<Array<{ shard_id: string }>>`
          UPDATE ${locksTableSql}
          SET acquired_at = ${sqlNow}
          WHERE address = ${address} AND shard_id IN ${shardIdsStr};
          SELECT shard_id FROM ${locksTableSql} WHERE address = ${address} AND shard_id IN ${shardIdsStr}
        `.pipe(
          execWithLockConnUnprepared,
          Effect.map((rows) => rows[1].map((row) => row.shard_id))
        )
      }
    },
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

  const withLockOperationDeadline = <A, E, R>(operation: Effect.Effect<A, E, R>) =>
    onErrorRebuildLockConn(withDeadline(operation))

  const releaseShard = sql.onDialectOrElse({
    pg: () => {
      if (disableAdvisoryLocks) {
        return (address: string, shardId: string) =>
          sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`.pipe(
            execWithLockConn
          )
      }
      return Effect.fnUntraced(
        function*(_address, shardId) {
          const lockNum = lockNumbers.get(shardId)!
          for (let i = 0; i < 5; i++) {
            const [conn] = yield* lockConn!.await
            yield* conn.executeRaw(`SELECT pg_advisory_unlock(${lockNum})`, [])
            const takenLocks = yield* conn.executeValues(
              `SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND granted = true AND pid = pg_backend_pid() AND objid = ${lockNum}`,
              []
            )
            if (takenLocks.length === 0) return
          }
          const [conn] = yield* lockConn!.await
          yield* conn.executeRaw(`SELECT pg_advisory_unlock_all()`, [])
        },
        onErrorRebuildLockConn,
        Effect.asVoid
      )
    },
    mysql: () => {
      if (disableAdvisoryLocks) {
        return (address: string, shardId: string) =>
          sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`.pipe(
            execWithLockConn
          )
      }
      return Effect.fnUntraced(
        function*(_address, shardId) {
          const lockName = lockNames.get(shardId)!
          while (true) {
            const [conn, pid] = yield* lockConn!.await
            yield* conn.executeRaw(`SELECT RELEASE_LOCK('${lockName}')`, [])
            const takenLocks = yield* conn.executeValues(`SELECT IS_USED_LOCK('${lockName}')`, [])
            if (takenLocks.length === 0 || takenLocks[0][0] !== pid) return
          }
        },
        onErrorRebuildLockConn,
        Effect.asVoid
      )
    },
    orElse: () => (address: string, shardId: string) =>
      sql`DELETE FROM ${locksTableSql} WHERE address = ${address} AND shard_id = ${shardId}`
  })

  const releaseAllShards = sql.onDialectOrElse({
    pg: () => (address: string) =>
      disableAdvisoryLocks
        ? sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`.pipe(execWithLockConn)
        : sql`SELECT pg_advisory_unlock_all()`.pipe(execWithLockConn, Effect.asVoid),
    mysql: () => (address: string) =>
      disableAdvisoryLocks
        ? sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`.pipe(execWithLockConn)
        : sql`SELECT RELEASE_ALL_LOCKS()`.pipe(execWithLockConn, Effect.asVoid),
    orElse: () => (address: string) => sql`DELETE FROM ${locksTableSql} WHERE address = ${address}`
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
      withLockOperationDeadline(acquireLock(address, shardIds)).pipe(
        PersistenceError.refail,
        withTracerDisabled
      ),

    refresh: (address, shardIds) =>
      withLockOperationDeadline(
        sql`UPDATE ${runnersTableSql} SET last_heartbeat = ${sqlNow} WHERE address = ${address}`.pipe(
          execWithLockConn,
          shardIds.length > 0
            ? Effect.andThen(refreshShards(address, shardIds))
            : Effect.as([])
        )
      ).pipe(
        PersistenceError.refail
      ),

    release: (address, shardId) =>
      withLockOperationDeadline(releaseShard(address, shardId)).pipe(
        Effect.asVoid,
        PersistenceError.refail,
        withTracerDisabled
      ),

    releaseAll: (address) =>
      withLockOperationDeadline(releaseAllShards(address)).pipe(
        Effect.asVoid,
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
