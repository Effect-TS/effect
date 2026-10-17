import { MysqlConnection } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import { SqlClient } from "effect/unstable/sql"
import { MysqlContainer, rowsOf } from "./utils.ts"

const connect = (overrides: Partial<MysqlConnection.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlConnection.make({
      url: Redacted.make(container.getConnectionUri()),
      ...overrides
    }))

/** Fills a table with `count` rows, using a recursive CTE rather than a loop. */
const seed = (conn: MysqlConnection.MysqlConnection, table: string, count: number) =>
  Effect.gen(function*() {
    yield* conn.query(`CREATE TABLE ${table} (n INT)`)
    yield* conn.query(`SET SESSION cte_max_recursion_depth = ${count + 1}`)
    yield* conn.query(
      `INSERT INTO ${table} (n) WITH RECURSIVE seq(x) AS (
         SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < ${count}
       ) SELECT x FROM seq`
    )
  })

describe("streaming", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds" })("against a real server", (it) => {
    it.effect("emits the same rows execute returns", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* seed(conn, "stream_parity", 500)
        const streamed = yield* Stream.runCollect(conn.stream("SELECT n FROM stream_parity ORDER BY n", []))
        const rows = rowsOf(yield* conn.execute("SELECT n FROM stream_parity ORDER BY n", []))
        assert.strictEqual(streamed.length, 500)
        assert.deepStrictEqual(Array.from(streamed), Array.from(rows))
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("applies backpressure across many rows", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* seed(conn, "stream_many", 2000)
        // The queue holds 128 rows, so a result this size pauses and resumes
        // the socket repeatedly rather than buffering everything.
        const total = yield* Stream.runFold(
          conn.stream("SELECT n FROM stream_many ORDER BY n", []),
          () => 0,
          (sum, row) => sum + Number(row.n)
        )
        assert.strictEqual(total, (2000 * 2001) / 2)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("leaves the session usable after a stream is abandoned", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* seed(conn, "stream_abandon", 2000)
        // Taking one row closes the stream's scope with most of the result set
        // still in flight, which has to be cancelled and drained.
        const head = yield* Stream.runHead(conn.stream("SELECT n FROM stream_abandon ORDER BY n", []))
        assert.deepStrictEqual(head, Option.some({ n: 1 }))

        // The session must be clean enough for the next command.
        const rows = rowsOf(yield* conn.query("SELECT COUNT(*) AS c FROM stream_abandon"))
        assert.strictEqual(rows[0].c, 2000n)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    // The test above reaches the abandoned-stream drain, but only reaches the
    // hard case by luck. Two things have to line up. The consumer has to stall
    // long enough for the producer to fill the stream's queue, which pauses the
    // socket and — since nothing drains that queue — never resumes it. And the
    // reply has to be too large to be sitting in the parser's buffer already,
    // or the drain finds its terminator without reading the socket at all and
    // the pause goes unnoticed. Padding the rows out to roughly 4MB is what
    // makes it certain: at this size the drain has to lift the pause itself.
    it.effect("drains an abandoned stream that backpressure left paused", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        yield* seed(conn, "stream_paused", 20_000)
        // `withLive` because `it.layer` installs a `TestClock`, under which the
        // sleep would never elapse and the test would hang whether or not the
        // drain works.
        const head = yield* conn.stream(
          "SELECT n, RPAD('x', 200, 'x') AS p FROM stream_paused ORDER BY n",
          []
        ).pipe(
          Stream.tap(() => Effect.sleep("250 millis")),
          Stream.runHead,
          TestClock.withLive
        )
        assert.deepStrictEqual(Option.map(head, (row) => row.n), Option.some(1))

        // The session must be clean enough for the next command.
        const rows = rowsOf(yield* conn.query("SELECT COUNT(*) AS c FROM stream_paused"))
        assert.strictEqual(rows[0].c, 20_000n)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("streams over the text protocol when preparation is disabled", () =>
      Effect.gen(function*() {
        const conn = yield* connect({ prepare: false })
        yield* seed(conn, "stream_text", 300)
        const streamed = yield* Stream.runCollect(conn.stream("SELECT n FROM stream_text WHERE n > ?", [297]))
        assert.deepStrictEqual(Array.from(streamed), [{ n: 298 }, { n: 299 }, { n: 300 }])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("fails the stream on a server error", () =>
      Effect.gen(function*() {
        const conn = yield* connect()
        const error = yield* Effect.flip(Stream.runCollect(conn.stream("SELECT * FROM no_stream_table", [])))
        assert.strictEqual(error.reason._tag, "SqlSyntaxError")
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("streams through the client", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        yield* sql`CREATE TABLE client_stream (n INT)`
        yield* sql`INSERT INTO client_stream ${sql.insert([{ n: 1 }, { n: 2 }, { n: 3 }])}`
        const rows = yield* Stream.runCollect(sql`SELECT n FROM client_stream ORDER BY n`.stream)
        assert.deepStrictEqual(Array.from(rows), [{ n: 1 }, { n: 2 }, { n: 3 }])
      }).pipe(Effect.provide(MysqlContainer.client)), { timeout: 60_000 })

    it.effect("applies result transforms to streamed rows", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        yield* sql`CREATE TABLE stream_transform (user_id INT)`
        yield* sql`INSERT INTO stream_transform ${sql.insert([{ userId: 1 }, { userId: 2 }])}`
        const rows = yield* Stream.runCollect(sql`SELECT * FROM stream_transform ORDER BY user_id`.stream)
        assert.deepStrictEqual(Array.from(rows), [{ userId: 1 }, { userId: 2 }])
      }).pipe(Effect.provide(MysqlContainer.clientWithTransforms)), { timeout: 60_000 })
  })
})
