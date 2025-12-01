/**
 * @since 1.0.0
 */
import * as PersistedQueue from "@effect/experimental/PersistedQueue"
import * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as RcMap from "effect/RcMap"
import * as Schedule from "effect/Schedule"
import type * as Scope from "effect/Scope"
import * as SqlClient from "./SqlClient.js"
import type { SqlError } from "./SqlError.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  options?: {
    readonly tableName?: string | undefined
    readonly pollInterval?: Duration.DurationInput | undefined
    readonly lockRefreshInterval?: Duration.DurationInput | undefined
    readonly lockExpiration?: Duration.DurationInput | undefined
  } | undefined
) => Effect.Effect<
  PersistedQueue.PersistedQueueStore["Type"],
  SqlError,
  SqlClient.SqlClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const sql = (yield* SqlClient.SqlClient).withoutTransforms()
  const tableName = options?.tableName ?? "effect_queue"
  const tableNameSql = sql(tableName)
  const pollInterval = options?.pollInterval
    ? Duration.decode(options.pollInterval)
    : Duration.millis(1000)
  const lockRefreshInterval = options?.lockRefreshInterval
    ? Duration.decode(options.lockRefreshInterval)
    : Duration.seconds(30)
  const lockExpiration = options?.lockExpiration ? Duration.decode(options.lockExpiration) : Duration.minutes(2)
  const lockExpirationSql = sql.literal(Math.ceil(Duration.toSeconds(lockExpiration)).toString())
  const workerId = crypto.randomUUID()

  const sqlNow = sql.onDialectOrElse({
    mssql: () => sql.literal("GETDATE()"),
    mysql: () => sql.literal("NOW()"),
    pg: () => sql.literal("NOW()"),
    // sqlite
    orElse: () => sql.literal("CURRENT_TIMESTAMP")
  })

  const expiresAt = sql.onDialectOrElse({
    pg: () => sql`${sqlNow} - INTERVAL '${lockExpirationSql} seconds'`,
    mysql: () => sql`DATE_SUB(${sqlNow}, INTERVAL ${lockExpirationSql} SECOND)`,
    mssql: () => sql`DATEADD(SECOND, -${lockExpirationSql}, ${sqlNow})`,
    orElse: () => sql`datetime(${sqlNow}, '-${lockExpirationSql} seconds')`
  })

  yield* sql.onDialectOrElse({
    mysql: () =>
      sql`CREATE TABLE IF NOT EXISTS ${tableNameSql} (
        sequence BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id VARCHAR(36) NOT NULL,
        queue_name VARCHAR(100) NOT NULL,
        element TEXT NOT NULL,
        completed BOOLEAN NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        last_failure TEXT NULL,
        acquired_at DATETIME NULL,
        acquired_by VARCHAR(36) NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )`,
    pg: () =>
      sql`CREATE TABLE IF NOT EXISTS ${tableNameSql} (
        sequence SERIAL PRIMARY KEY,
        id VARCHAR(36) NOT NULL,
        queue_name VARCHAR(100) NOT NULL,
        element TEXT NOT NULL,
        completed BOOLEAN NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_failure TEXT NULL,
        acquired_at TIMESTAMP NULL,
        acquired_by UUID NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      )`,
    mssql: () =>
      sql`IF NOT EXISTS (SELECT * FROM sysobjects WHERE name=${tableNameSql} AND xtype='U')
      CREATE TABLE ${tableNameSql} (
        sequence INT IDENTITY(1,1) PRIMARY KEY,
        id NVARCHAR(36) NOT NULL,
        queue_name NVARCHAR(100) NOT NULL,
        element NVARCHAR(MAX) NOT NULL,
        completed BIT NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        last_failure NVARCHAR(MAX) NULL,
        acquired_at DATETIME2 NULL,
        acquired_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 NOT NULL,
        updated_at DATETIME2 NOT NULL
      )`,
    // sqlite
    orElse: () =>
      sql`CREATE TABLE IF NOT EXISTS ${tableNameSql} (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL,
        queue_name TEXT NOT NULL,
        element TEXT NOT NULL,
        completed BOOLEAN NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_failure TEXT NULL,
        acquired_at DATETIME NULL,
        acquired_by TEXT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )`
  })

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_${tableName}_id')
        CREATE UNIQUE INDEX idx_${tableNameSql}_id ON ${tableNameSql} (id)`,
    mysql: () => sql`CREATE UNIQUE INDEX ${sql(`idx_${tableName}_id`)} ON ${tableNameSql} (id)`.pipe(Effect.ignore),
    orElse: () => sql`CREATE UNIQUE INDEX IF NOT EXISTS ${sql(`idx_${tableName}_id`)} ON ${tableNameSql} (id)`
  })

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_${tableName}_take')
        CREATE INDEX idx_${tableNameSql}_take ON ${tableNameSql} (queue_name, completed, attempts, acquired_at)`,
    mysql: () =>
      sql`CREATE INDEX ${
        sql(`idx_${tableName}_take`)
      } ON ${tableNameSql} (queue_name, completed, attempts, acquired_at)`
        .pipe(Effect.ignore),
    orElse: () =>
      sql`CREATE INDEX IF NOT EXISTS ${
        sql(`idx_${tableName}_take`)
      } ON ${tableNameSql} (queue_name, completed, attempts, acquired_at)`
  })

  yield* sql.onDialectOrElse({
    mssql: () =>
      sql`IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'idx_${tableName}_update')
        CREATE INDEX ${sql(`idx_${tableName}_update`)} ON ${tableNameSql} (sequence, acquired_by)`,
    mysql: () =>
      sql`CREATE INDEX ${sql(`idx_${tableName}_update`)} ON ${tableNameSql} (sequence, acquired_by)`.pipe(
        Effect.ignore
      ),
    orElse: () =>
      sql`CREATE INDEX IF NOT EXISTS ${sql(`idx_${tableName}_update`)} ON ${tableNameSql} (sequence, acquired_by)`
  })

  const offer = sql.onDialectOrElse({
    pg: () => (id: string, name: string, element: string) =>
      sql`
        INSERT INTO ${tableNameSql} (id, queue_name, element, completed, attempts, created_at, updated_at)
        VALUES (${id}, ${name}, ${element}, FALSE, 0, ${sqlNow}, ${sqlNow})
        ON CONFLICT (id) DO NOTHING
      `,
    mysql: () => (id: string, name: string, element: string) =>
      sql`
        INSERT IGNORE INTO ${tableNameSql} (id, queue_name, element, completed, attempts, created_at, updated_at)
        VALUES (${id}, ${name}, ${element}, FALSE, 0, ${sqlNow}, ${sqlNow})
      `,
    mssql: () => (id: string, name: string, element: string) =>
      sql`
        IF NOT EXISTS (SELECT 1 FROM ${tableNameSql} WHERE id = ${id})
        BEGIN
          INSERT INTO ${tableNameSql} (id, queue_name, element, completed, attempts, created_at, updated_at)
          VALUES (${id}, ${name}, ${element}, 0, 0, ${sqlNow}, ${sqlNow})
        END
      `,
    // sqlite
    orElse: () => (id: string, name: string, element: string) =>
      sql`
        INSERT OR IGNORE INTO ${tableNameSql} (id, queue_name, element, completed, attempts, created_at, updated_at)
        VALUES (${id}, ${name}, ${element}, FALSE, 0, ${sqlNow}, ${sqlNow})
      `
  })

  const wrapString = sql.onDialectOrElse({
    mssql: () => (s: string) => `N'${s}'`,
    orElse: () => (s: string) => `'${s}'`
  })
  const stringLiteral = (s: string) => sql.literal(wrapString(s))

  const sqlTrue = sql.onDialectOrElse({
    sqlite: () => sql.literal("1"),
    orElse: () => sql.literal("TRUE")
  })

  const workerIdSql = stringLiteral(workerId)
  const elementIds = new Set<number>()
  const refreshLocks: Effect.Effect<void, SqlError> = Effect.suspend((): Effect.Effect<void, SqlError> => {
    if (elementIds.size === 0) return Effect.void
    return sql`
      UPDATE ${tableNameSql}
      SET acquired_at = ${sqlNow}
      WHERE acquired_by = ${workerIdSql}
    `
  })
  const complete = (sequence: number, attempts: number) => {
    elementIds.delete(sequence)
    return sql`
      UPDATE ${tableNameSql}
      SET acquired_at = NULL, acquired_by = NULL, updated_at = ${sqlNow}, completed = ${sqlTrue}, attempts = ${attempts}
      WHERE sequence = ${sequence}
      AND acquired_by = ${workerIdSql}
    `.pipe(
      Effect.retry({
        times: 5,
        schedule: Schedule.exponential(100, 1.5)
      }),
      Effect.orDie
    )
  }
  const retry = (sequence: number, attempts: number, cause: Cause.Cause<any>) => {
    elementIds.delete(sequence)
    return sql`
      UPDATE ${tableNameSql}
      SET acquired_at = NULL, acquired_by = NULL, updated_at = ${sqlNow}, attempts = ${attempts}, last_failure = ${
      Cause.pretty(cause, { renderErrorCause: true })
    }
      WHERE sequence = ${sequence}
      AND acquired_by = ${workerIdSql}
    `.pipe(
      Effect.retry({
        times: 5,
        schedule: Schedule.exponential(100, 1.5)
      }),
      Effect.orDie
    )
  }
  const interrupt = (ids: Array<number>) => {
    for (const id of ids) {
      elementIds.delete(id)
    }
    return sql`
      UPDATE ${tableNameSql}
      SET acquired_at = NULL, acquired_by = NULL
      WHERE sequence IN (${sql.literal(ids.join(","))})
      AND acquired_by = ${workerIdSql}
    `.pipe(
      Effect.retry({
        times: 5,
        schedule: Schedule.exponential(100, 1.5)
      }),
      Effect.orDie
    )
  }

  yield* refreshLocks.pipe(
    Effect.tapErrorCause(Effect.logWarning),
    Effect.retry(Schedule.spaced(500)),
    Effect.scheduleForked(Schedule.fixed(lockRefreshInterval)),
    Effect.annotateLogs({
      package: "@effect/sql",
      module: "SqlPersistedQueue",
      fiber: "refreshLocks"
    }),
    Effect.interruptible
  )

  type Element = {
    readonly id: string
    sequence: number
    readonly queue_name: string
    element: string
    readonly attempts: number
  }
  const mailboxes = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*({ maxAttempts, name }: QueueKey) {
      const mailbox = yield* Mailbox.make<Element>()
      const takers = MutableRef.make(0)
      const pollLatch = Effect.unsafeMakeLatch()
      const takenLatch = Effect.unsafeMakeLatch()

      yield* Effect.addFinalizer(() =>
        Effect.flatMap(mailbox.clear, (elements) => {
          if (elements.length === 0) return Effect.void
          return interrupt(Array.from(elements, (e) => e.sequence))
        })
      )

      const poll = sql.onDialectOrElse({
        pg: () => (size: number) =>
          sql<Element>`
            WITH cte AS (
              UPDATE ${tableNameSql}
              SET acquired_at = ${sqlNow}, acquired_by = ${workerIdSql}
              WHERE sequence IN (
                SELECT sequence FROM ${tableNameSql}
                WHERE queue_name = ${name}
                AND completed = FALSE
                AND attempts < ${maxAttempts}
                AND (acquired_at IS NULL OR acquired_at < ${expiresAt})
                ORDER BY updated_at ASC, sequence ASC
                FOR UPDATE SKIP LOCKED
                LIMIT ${sql.literal(size.toString())}
              )
              RETURNING sequence, id, queue_name, element, attempts, updated_at
            )
            SELECT sequence, id, queue_name, element, attempts FROM cte
            ORDER BY updated_at ASC, sequence ASC
          `,
        mysql: () => (size: number) =>
          sql<Element>`
            SELECT sequence, id, queue_name, element, attempts FROM ${tableNameSql} q
            WHERE queue_name = ${name}
            AND completed = FALSE
            AND attempts < ${maxAttempts}
            AND (acquired_at IS NULL OR acquired_at < ${expiresAt})
            ORDER BY updated_at ASC, sequence ASC
            LIMIT ${sql.literal(size.toString())}
            FOR UPDATE SKIP LOCKED
          `.pipe(
            Effect.tap((rows) => {
              if (rows.length === 0) return Effect.void
              return sql`
                UPDATE ${tableNameSql}
                SET acquired_at = ${sqlNow}, acquired_by = ${workerIdSql}
                WHERE sequence IN (${sql.literal(rows.map((r) => r.sequence).join(","))})
              `.unprepared
            }),
            sql.withTransaction
          ),
        mssql: () => (size: number) =>
          sql<Element>`
            WITH cte AS (
              SELECT TOP ${sql.literal(size.toString())} sequence FROM ${tableNameSql}
              WHERE queue_name = ${name}
              AND completed = 0
              AND attempts < ${maxAttempts}
              AND (acquired_at IS NULL OR acquired_at < ${expiresAt})
              ORDER BY updated_at ASC, sequence ASC
            )
            UPDATE q
            SET acquired_at = ${sqlNow}, acquired_by = ${workerIdSql}
            OUTPUT inserted.sequence, inserted.id, inserted.queue_name, inserted.element, inserted.attempts
            FROM ${tableNameSql} AS q
            INNER JOIN cte ON q.sequence = cte.sequence
          `,
        // sqlite
        orElse: () => (size: number) =>
          sql<Element>`
            UPDATE ${tableNameSql}
            SET acquired_at = ${sqlNow}, acquired_by = ${workerIdSql}
            WHERE queue_name = ${name}
            AND completed = FALSE
            AND attempts < ${maxAttempts}
            AND (acquired_at IS NULL OR acquired_at < ${expiresAt})
            RETURNING sequence, id, queue_name, element, attempts
            ORDER BY updated_at ASC, sequence ASC
            LIMIT ${sql.literal(size.toString())}
          `
      })

      yield* Effect.gen(function*() {
        while (true) {
          yield* pollLatch.await
          yield* Effect.yieldNow()
          const results = takers.current === 0 ? [] : yield* poll(takers.current)
          if (results.length === 0) {
            yield* Effect.sleep(pollInterval)
            continue
          }
          takenLatch.unsafeClose()
          for (let i = 0; i < results.length; i++) {
            const element = results[i]
            element.element = JSON.parse(element.element)
          }
          yield* mailbox.offerAll(results)
          yield* takenLatch.await
          yield* Effect.yieldNow()
        }
      }).pipe(
        Effect.sandbox,
        Effect.retry(Schedule.spaced(500)),
        Effect.forkScoped,
        Effect.interruptible
      )

      return { mailbox, takers, pollLatch, takenLatch } as const
    }),
    idleTimeToLive: Duration.seconds(30)
  })

  return PersistedQueue.PersistedQueueStore.of({
    offer: ({ element, id, name }) =>
      Effect.catchAllCause(Effect.suspend(() => offer(id, name, JSON.stringify(element))), (cause) =>
        Effect.fail(
          new PersistedQueue.PersistedQueueError({
            message: "Failed to offer element to persisted queue",
            cause: Cause.squash(cause)
          })
        )),
    take: ({ maxAttempts, name }) =>
      Effect.uninterruptibleMask((restore) =>
        RcMap.get(mailboxes, new QueueKey({ name, maxAttempts })).pipe(
          Effect.flatMap(({ mailbox, pollLatch, takenLatch, takers }) => {
            takers.current++
            if (takers.current === 1) {
              pollLatch.unsafeOpen()
            }
            return Effect.tap(restore(mailbox.take as Effect.Effect<Element>), () => {
              takers.current--
              if (takers.current === 0) {
                pollLatch.unsafeClose()
                takenLatch.unsafeOpen()
              } else if (Option.getOrUndefined(mailbox.unsafeSize()) === 0) {
                takenLatch.unsafeOpen()
              }
            })
          }),
          Effect.scoped,
          restore,
          Effect.tap((element) =>
            Effect.addFinalizer(Exit.match({
              onFailure: (cause) =>
                Cause.isInterruptedOnly(cause)
                  ? interrupt([element.sequence])
                  : retry(element.sequence, element.attempts + 1, cause),
              onSuccess: () => complete(element.sequence, element.attempts + 1)
            }))
          )
        )
      )
  })
})

class QueueKey extends Data.Class<{
  readonly name: string
  readonly maxAttempts: number
}> {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layerStore = (options?: {
  readonly tableName?: string | undefined
  readonly pollInterval?: Duration.DurationInput | undefined
  readonly lockRefreshInterval?: Duration.DurationInput | undefined
  readonly lockExpiration?: Duration.DurationInput | undefined
}): Layer.Layer<
  PersistedQueue.PersistedQueueStore,
  SqlError,
  SqlClient.SqlClient
> => Layer.scoped(PersistedQueue.PersistedQueueStore, make(options))
