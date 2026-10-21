import { MssqlClient } from "@effect/sql-mssql"
import { assert, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Latch, Layer, Pool, Schedule, Schema, Stream } from "effect"
import * as PersistedCacheTest from "effect-test/persistence/PersistedCacheTest"
import * as PersistedQueueSqlTest from "effect-test/persistence/PersistedQueueSqlTest"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import { PersistedQueue, Persistence } from "effect/persistence"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient, SqlError, Statement } from "effect/sql"
import { TestClock } from "effect/testing"
import * as Tedious from "tedious"
import { MssqlContainer } from "./utils.ts"

PersistedCacheTest.suite(
  "sql-mssql-multi",
  Persistence.layerSqlMultiTable.pipe(Layer.provide(MssqlContainer.layerClient))
)

PersistedCacheTest.suite(
  "sql-mssql-single",
  Persistence.layerSql.pipe(Layer.provide(MssqlContainer.layerClient))
)

// Allow extra time for MSSQL-backed layer setup and teardown under CI load.
// Keep the queue test bodies at their 30-second timeout.
PersistedQueueTest.suiteWith(
  "sql-mssql",
  PersistedQueue.layerStoreSql().pipe(Layer.provide(MssqlContainer.layerClient)),
  it,
  "30 seconds",
  "90 seconds"
)

// Records deadlock graphs until the returned effect reads them. The built-in
// system_health session can buffer events for minutes, so a dedicated session
// dispatches them within a second.
const captureDeadlocks = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const name = `effect_deadlocks_${crypto.randomUUID().replaceAll("-", "")}`
  const session = sql(name)
  const drop = sql`IF EXISTS (SELECT 1 FROM sys.server_event_sessions WHERE name = ${name})
    DROP EVENT SESSION ${session} ON SERVER`
  // The reader drops the session before the test scope interrupts any queue
  // statements; this only covers a test that fails before reading.
  yield* Effect.acquireRelease(
    sql`CREATE EVENT SESSION ${session} ON SERVER
      ADD EVENT sqlserver.xml_deadlock_report
      ADD TARGET package0.ring_buffer
      WITH (MAX_DISPATCH_LATENCY = 1 SECONDS);
      ALTER EVENT SESSION ${session} ON SERVER STATE = START`,
    () => Effect.ignore(drop)
  )
  return Effect.gen(function*() {
    // every statement has returned, so any deadlock was already detected and
    // only waits on the session's dispatch latency
    yield* Effect.sleep("2 seconds")
    const rows = yield* sql<{ readonly graph: string }>`
      SELECT CAST(x.e.query('.') AS NVARCHAR(MAX)) AS graph
      FROM sys.dm_xe_sessions s
      INNER JOIN sys.dm_xe_session_targets t ON t.event_session_address = s.address
      CROSS APPLY (SELECT CAST(t.target_data AS XML) AS data) d
      CROSS APPLY d.data.nodes('RingBufferTarget/event[@name="xml_deadlock_report"]') AS x(e)
      WHERE s.name = ${name} AND t.target_name = N'ring_buffer'
    `
    yield* drop
    return rows.map(({ graph }) => graph)
  })
})

// e.g. "UPDATE vs UPDATE on PK X, idx_queue_take S"
const summarizeDeadlock = (graph: string) => {
  const transactions = Array.from(graph.matchAll(/transactionname="([^"]*)"/g), ([, name]) => name)
  const locks = Array.from(
    graph.matchAll(/<keylock [^>]*indexname="([^"]*)"[^>]*mode="([^"]*)"/g),
    ([, index, mode]) => `${index.startsWith("PK__") ? "PK" : index} ${mode}`
  )
  return `${transactions.join(" vs ")} on ${Array.from(new Set(locks)).join(", ")}`
}

// A third-party mssql-dialect client built from the public SqlClient
// constructor, whose sessions run with XACT_ABORT ON: any error inside a
// transaction dooms it.
const makeXactAbortClient = Effect.fnUntraced(function*(database: string) {
  const container = yield* MssqlContainer
  const fail = (cause: unknown) =>
    Effect.fail(new SqlError.SqlError({ reason: new SqlError.UnknownError({ cause, operation: "execute" }) }))
  const connect = Effect.acquireRelease(
    Effect.callback<Tedious.Connection, SqlError.SqlError>((resume) => {
      const conn = new Tedious.Connection({
        server: container.getHost(),
        authentication: {
          type: "default",
          options: { userName: container.getUsername(), password: container.getPassword() }
        },
        options: {
          port: container.getPort(),
          database,
          encrypt: !("Deno" in globalThis),
          trustServerCertificate: true,
          abortTransactionOnError: true,
          rowCollectionOnRequestCompletion: true,
          useColumnNames: false
        }
      })
      conn.connect((cause) => resume(cause ? fail(cause) : Effect.succeed(conn)))
    }),
    (conn) => Effect.sync(() => conn.close())
  )
  const pool = yield* Pool.make({ acquire: connect, size: 4 })

  const run = (conn: Tedious.Connection, sql: string, params: ReadonlyArray<unknown>, rowsAsArray: boolean) =>
    Effect.callback<ReadonlyArray<any>, SqlError.SqlError>((resume) => {
      const request = new Tedious.Request(sql, (
        cause,
        _rowCount,
        rows: Array<Array<{ readonly metadata: { readonly colName: string }; readonly value: unknown }>>
      ) => {
        resume(
          cause ? fail(cause) : Effect.succeed(rows.map((row) =>
            rowsAsArray
              ? row.map((column) => column.value)
              : Object.fromEntries(row.map((column) => [column.metadata.colName, column.value]))
          ))
        )
      })
      params.forEach((value, i) => {
        request.addParameter(`${i + 1}`, MssqlClient.defaultParameterTypes[Statement.primitiveKind(value)], value)
      })
      // transaction control runs as a plain batch, so it outlives the statement
      if (params.length === 0) {
        conn.execSqlBatch(request)
      } else {
        conn.execSql(request)
      }
    })

  return yield* SqlClient.make({
    driver: "test-xact-abort",
    compiler: MssqlClient.makeCompiler(),
    spanAttributes: [],
    beginTransaction: "BEGIN TRANSACTION",
    commit: "COMMIT TRANSACTION",
    rollback: "ROLLBACK TRANSACTION",
    savepoint: (name) => `SAVE TRANSACTION ${name}`,
    rollbackSavepoint: (name) => `ROLLBACK TRANSACTION ${name}`,
    acquirer: Effect.map(Pool.get(pool), (conn) => ({
      execute: (sql, params, transformRows) =>
        Effect.map(run(conn, sql, params, false), (rows) => transformRows ? transformRows(rows) : rows),
      executeRaw: (sql, params) => run(conn, sql, params, false),
      executeStream: () => Stream.die("executeStream not implemented"),
      executeValues: (sql, params) => run(conn, sql, params, true),
      executeValuesUnprepared: (sql, params) => run(conn, sql, params, true),
      executeUnprepared: (sql, params, transformRows) =>
        Effect.map(run(conn, sql, params, false), (rows) => transformRows ? transformRows(rows) : rows)
    }))
  }).pipe(Effect.provide(Reactivity.layer))
})

it.layer(MssqlContainer.layerClient, { timeout: "90 seconds" })((it) => {
  PersistedQueueSqlTest.suiteWith(it)

  it.effect("PersistedQueue offers, claims and settlements do not deadlock", () =>
    Effect.gen(function*() {
      const tableName = "effect_queue_mssql_deadlocks"
      const readDeadlocks = yield* captureDeadlocks
      const makeQueue = Effect.gen(function*() {
        const store = yield* PersistedQueue.makeStoreSql({ tableName, pollInterval: "10 millis" })
        const factory = yield* PersistedQueue.makeFactory.pipe(
          Effect.provideService(PersistedQueue.PersistedQueueStore, store)
        )
        return yield* factory.make({ name: tableName, schema: Schema.Number, retrySchedule: Schedule.spaced(0) })
      })
      // two stores poll the same table, so claims race each other as well as
      // offers and settlements
      const queues = [yield* makeQueue, yield* makeQueue]

      const total = 120
      const deliveries = new Map<number, number>()
      const succeeded = new Set<number>()
      const completed = Latch.makeUnsafe()
      for (const queue of queues) {
        const worker = queue.take((n) =>
          Effect.suspend(() => {
            const count = (deliveries.get(n) ?? 0) + 1
            deliveries.set(n, count)
            // every third element fails its first delivery, so claims also
            // race retries
            if (n % 3 === 0 && count === 1) {
              return Effect.fail("transient")
            }
            succeeded.add(n)
            if (succeeded.size === total) {
              completed.openUnsafe()
            }
            return Effect.void
          })
        ).pipe(Effect.ignore, Effect.forever)
        for (let i = 0; i < 3; i++) {
          yield* Effect.forkScoped(worker)
        }
      }

      const offered = yield* Effect.forEach(
        Array.from({ length: total }, (_, n) => n),
        (n) => queues[n % 2].offer(n),
        { concurrency: 10, discard: true }
      ).pipe(Effect.exit)
      if (Exit.isSuccess(offered)) {
        yield* completed.await.pipe(Effect.timeoutOption("15 seconds"))
      }

      // a lock resource names the table as objectname="<database>.<schema>.<table>"
      const deadlocks = (yield* readDeadlocks).filter((graph) => graph.includes(`.${tableName}"`))
      assert.deepStrictEqual(deadlocks.map(summarizeDeadlock), [], "deadlocks")
      assert.isTrue(Exit.isSuccess(offered), String(offered))
      assert.strictEqual(succeeded.size, total)
      for (const [n, count] of deliveries) {
        assert.strictEqual(count, n % 3 === 0 ? 2 : 1, `deliveries for element ${n}`)
      }
    }).pipe(TestClock.withLive), { timeout: 30000 })
})

// These run one at a time on a server of their own: concurrent table creation
// can deadlock on the system catalog, which is not what they test.
it.layer(MssqlContainer.layerClient, { concurrent: false, timeout: "90 seconds" })(
  "PersistedQueue SQL Server duplicates",
  (it) => {
    it.effect(
      "PersistedQueue skips an offer racing an uncommitted duplicate under XACT_ABORT",
      () =>
        Effect.gen(function*() {
          const master = yield* SqlClient.SqlClient
          const database = "effect_queue_xact_abort"
          // With read committed snapshot, the Azure SQL Database default, a plain
          // read does not wait for another transaction's uncommitted offer.
          yield* master`IF DB_ID(${database}) IS NULL CREATE DATABASE ${master(database)}`
          yield* master`ALTER DATABASE ${master(database)} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE`
          const sql = yield* makeXactAbortClient(database)

          const tableName = "effect_queue_xact_abort"
          const store = yield* PersistedQueue.makeStoreSql({ tableName }).pipe(
            Effect.provideService(SqlClient.SqlClient, sql)
          )
          const factory = yield* PersistedQueue.makeFactory.pipe(
            Effect.provideService(PersistedQueue.PersistedQueueStore, store)
          )
          const queue = yield* factory.make({ name: tableName, schema: Schema.String })

          const offered = Latch.makeUnsafe()
          const first = yield* Effect.gen(function*() {
            yield* queue.offer("first", { id: "job" })
            yield* offered.open
            // commit only once the duplicate offer is waiting on this row
            yield* Effect.sleep("1 second")
          }).pipe(sql.withTransaction, Effect.forkScoped)
          yield* offered.await

          const second = yield* Effect.gen(function*() {
            const [{ xactAbort }] = yield* sql<{ readonly xactAbort: number }>`
          SELECT @@OPTIONS & 16384 AS xactAbort
        `
            assert.strictEqual(xactAbort, 16384, "XACT_ABORT is on for the duplicate offer")
            yield* queue.offer("duplicate", { id: "job" })
            yield* queue.offer("other", { id: "other" })
          }).pipe(sql.withTransaction, Effect.exit)
          yield* Fiber.join(first)

          assert.isTrue(Exit.isSuccess(second), String(second))
          const rows = yield* sql<{ readonly id: string; readonly element: string }>`
        SELECT id, element FROM ${sql(tableName)} ORDER BY id
      `
          assert.deepStrictEqual(rows, [
            { id: "job", element: JSON.stringify("first") },
            { id: "other", element: JSON.stringify("other") }
          ])
        }).pipe(TestClock.withLive),
      { timeout: 30000 }
    )

    it.effect(
      "PersistedQueue skips a duplicate an older release's offer inserts while the offer waits",
      () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const xa = yield* makeXactAbortClient((yield* MssqlContainer).getDatabase())
          const tableName = "effect_queue_mixed_release"
          const queue = yield* Effect.gen(function*() {
            const store = yield* PersistedQueue.makeStoreSql({ tableName })
            const factory = yield* PersistedQueue.makeFactory.pipe(
              Effect.provideService(PersistedQueue.PersistedQueueStore, store)
            )
            return yield* factory.make({ name: tableName, schema: Schema.String })
          }).pipe(Effect.provideService(SqlClient.SqlClient, xa))
          // the SQL Server offer of releases before the MERGE was replaced, which
          // keeps writing during a rolling upgrade
          const legacyOffer = (id: string, element: string) =>
            sql`
          MERGE ${sql(tableName)} WITH (HOLDLOCK) AS target
          USING (SELECT ${id} AS id, ${tableName} AS queue_name) AS source
          ON target.id = source.id AND target.queue_name = source.queue_name
          WHEN NOT MATCHED THEN
            INSERT (id, queue_name, element, state, attempts, visible_at, created_at, updated_at)
            VALUES (source.id, source.queue_name, ${JSON.stringify(element)}, 'pending', 0,
              SYSDATETIME(), SYSDATETIME(), SYSDATETIME());
        `

          const legacyLocked = yield* Deferred.make<number>()
          const offerBlocked = Latch.makeUnsafe()
          const legacy = yield* Effect.gen(function*() {
            yield* legacyOffer("earlier", "earlier")
            const [{ spid }] = yield* sql<{ readonly spid: number }>`SELECT @@SPID AS spid`
            yield* Deferred.succeed(legacyLocked, spid)
            yield* offerBlocked.await
            yield* legacyOffer("job", "legacy")
          }).pipe(sql.withTransaction, Effect.forkScoped)
          const spid = yield* Deferred.await(legacyLocked)

          const offer = yield* Effect.gen(function*() {
            const [{ xactAbort }] = yield* xa<{ readonly xactAbort: number }>`
          SELECT @@OPTIONS & 16384 AS xactAbort
        `
            assert.strictEqual(xactAbort, 16384, "XACT_ABORT is on for the offer")
            yield* queue.offer("new", { id: "job" })
            yield* queue.offer("other", { id: "other" })
          }).pipe(xa.withTransaction, Effect.exit, Effect.forkScoped)

          // the older release inserts the same id only once the offer is waiting
          // on its range locks
          yield* sql<{ readonly blocked: number }>`
        SELECT COUNT(*) AS blocked FROM sys.dm_exec_requests WHERE blocking_session_id = ${spid}
      `.pipe(
            Effect.flatMap(([{ blocked }]) => blocked > 0 ? Effect.void : Effect.fail("not blocked yet")),
            Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 }),
            Effect.orDie
          )
          yield* offerBlocked.open
          yield* Fiber.join(legacy)

          const exit = yield* Fiber.join(offer)
          assert.isTrue(Exit.isSuccess(exit), String(exit))
          const rows = yield* sql<{ readonly id: string; readonly element: string }>`
        SELECT id, element FROM ${sql(tableName)} ORDER BY id
      `
          assert.deepStrictEqual(rows, [
            { id: "earlier", element: JSON.stringify("earlier") },
            { id: "job", element: JSON.stringify("legacy") },
            { id: "other", element: JSON.stringify("other") }
          ])
        }).pipe(TestClock.withLive),
      { timeout: 30000 }
    )
  }
)
