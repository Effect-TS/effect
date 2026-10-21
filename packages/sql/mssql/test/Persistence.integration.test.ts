import { assert, it } from "@effect/vitest"
import { Effect, Exit, Latch, Layer, Schedule, Schema } from "effect"
import * as PersistedCacheTest from "effect-test/persistence/PersistedCacheTest"
import * as PersistedQueueSqlTest from "effect-test/persistence/PersistedQueueSqlTest"
import * as PersistedQueueTest from "effect-test/persistence/PersistedQueueTest"
import { PersistedQueue, Persistence } from "effect/persistence"
import { SqlClient } from "effect/sql"
import { TestClock } from "effect/testing"
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

      const deadlocks = (yield* readDeadlocks).filter((graph) => graph.includes(tableName))
      assert.deepStrictEqual(deadlocks.map(summarizeDeadlock), [], "deadlocks")
      assert.isTrue(Exit.isSuccess(offered), String(offered))
      assert.strictEqual(succeeded.size, total)
      for (const [n, count] of deliveries) {
        assert.strictEqual(count, n % 3 === 0 ? 2 : 1, `deliveries for element ${n}`)
      }
    }).pipe(TestClock.withLive), { timeout: 30000 })
})
