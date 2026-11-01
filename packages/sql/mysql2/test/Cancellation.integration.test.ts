import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Stream } from "effect"
import { SqlClient } from "effect/sql"
import { MysqlContainer } from "./utils.ts"

// Every test uses a pool of one connection, so a statement or lease left
// behind by an interrupted fiber blocks the follow-up query.
const singleConnection = MysqlContainer.clientWith({ maxConnections: 1 })

it.layer(MysqlContainer.layer, { timeout: "90 seconds", excludeTestServices: true })((it) => {
  it.effect("interrupting a running statement kills it", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const slow = yield* sql`SELECT SLEEP(10)`.pipe(Effect.forkChild({ startImmediately: true }))
      yield* Effect.sleep("200 millis")
      yield* Fiber.interrupt(slow)

      const rows = yield* sql<{ running: number }>`
        SELECT COUNT(*) AS running FROM information_schema.processlist WHERE info = 'SELECT SLEEP(10)'
      `.pipe(Effect.timeout("2 seconds"))
      assert.deepStrictEqual(rows, [{ running: 0 }])
    }).pipe(Effect.provide(singleConnection)), { timeout: 30_000 })

  it.effect(
    "interrupting a pending reservation returns promptly and releases the late connection",
    () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const busy = yield* sql`SELECT SLEEP(3)`.pipe(Effect.forkChild({ startImmediately: true }))
        yield* Effect.sleep("200 millis")
        const waiting = yield* Effect.scoped(sql.reserve).pipe(Effect.forkChild({ startImmediately: true }))
        yield* Fiber.interrupt(waiting).pipe(Effect.timeout("1 second"))

        yield* Fiber.join(busy)
        const rows = yield* sql<{ value: number }>`SELECT 1 AS value`.pipe(Effect.timeout("2 seconds"))
        assert.deepStrictEqual(rows, [{ value: 1 }])
      }).pipe(Effect.provide(singleConnection)),
    { timeout: 30_000 }
  )

  it.effect("ending a stream early stops the statement", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      // Rows arrive before the server reaches the SLEEP, so the stream can end
      // while the statement is still running.
      const rows = yield* sql`
        WITH RECURSIVE seq (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 100000)
        SELECT /*+ SET_VAR(cte_max_recursion_depth = 100000) */ n, IF(n = 100000, SLEEP(10), 0) AS slept FROM seq
      `.stream.pipe(Stream.take(5), Stream.runCollect)
      assert.strictEqual(rows.length, 5)

      const next = yield* sql<{ value: number }>`SELECT 1 AS value`.pipe(Effect.timeout("2 seconds"))
      assert.deepStrictEqual(next, [{ value: 1 }])
    }).pipe(Effect.provide(singleConnection)), { timeout: 30_000 })
})
