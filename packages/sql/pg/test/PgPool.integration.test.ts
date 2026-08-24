import { PgConnection, PgPool } from "@effect/sql-pg"
import { assert, it } from "@effect/vitest"
import { Effect, Fiber, Redacted, Stream } from "effect"
import { PgContainer } from "./utils.ts"

// `it.effect` runs under the TestClock, so poll loops sleep in real time.
const realSleep = Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 10)))

const poolConfig = Effect.gen(function*() {
  const container = yield* PgContainer
  return { url: Redacted.make(container.getConnectionUri()) }
})

it.layer(PgContainer.layer, { timeout: "30 seconds" })("PgPool", (it) => {
  it.effect("reuses checked out connections", () =>
    Effect.gen(function*() {
      const pool = yield* PgPool.make({ ...(yield* poolConfig), maxConnections: 1 })
      const checkout = Effect.scoped(Effect.gen(function*() {
        const connection = yield* pool.get
        const result = yield* connection.query("SELECT $1::int4 AS one", [1])
        assert.deepStrictEqual(result.rows, [{ one: 1 }])
        return connection.processId
      }))
      const first = yield* checkout
      const second = yield* checkout
      assert.strictEqual(first, second)
    }))

  it.effect("streams rows incrementally and cancels on early abort", () =>
    Effect.gen(function*() {
      const pool = yield* PgPool.make(yield* poolConfig)
      const connection = yield* pool.get
      const rows = yield* Stream.runCollect(
        connection.stream("SELECT n FROM generate_series(1, $1::int4) AS g(n)", [1000])
      )
      assert.strictEqual(rows.length, 1000)
      assert.deepStrictEqual(rows[0], { n: 1 })
      assert.deepStrictEqual(rows[999], { n: 1000 })

      const aborted = yield* Stream.runCollect(
        connection.stream("SELECT n FROM generate_series(1, 1000000) AS g(n)").pipe(Stream.take(5))
      )
      assert.deepStrictEqual(aborted, [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }])

      // The connection survives the cancelled stream.
      const result = yield* connection.query("SELECT $1::text AS after", ["ok"])
      assert.deepStrictEqual(result.rows, [{ after: "ok" }])
    }))

  it.effect("keeps a multiplexed listener exclusive", () =>
    Effect.gen(function*() {
      const pool = yield* PgPool.make({ ...(yield* poolConfig), maxConnections: 2, multiplex: true })
      const listener = yield* pool.reserve
      const fiber = yield* Effect.forkScoped(Stream.runCollect(listener.listen("test_channel").pipe(Stream.take(1))))
      // Wait for LISTEN to be registered before notifying from another session.
      while (true) {
        const channels = yield* listener.query("SELECT pg_listening_channels() AS channel")
        if (channels.rows.some((row) => row.channel === "test_channel")) break
        yield* realSleep
      }
      const notifier = yield* pool.get
      assert.notStrictEqual(listener.processId, notifier.processId)
      yield* notifier.query("SELECT pg_notify($1, $2)", ["test_channel", "hello"])
      const notifications = yield* Fiber.join(fiber)
      assert.strictEqual(notifications.length, 1)
      assert.strictEqual(notifications[0].channel, "test_channel")
      assert.strictEqual(notifications[0].payload, "hello")
      assert.strictEqual(notifications[0].processId, notifier.processId)
    }))

  it.effect("returns a multiplexed reservation to shared circulation", () =>
    Effect.gen(function*() {
      const pool = yield* PgPool.make({ ...(yield* poolConfig), maxConnections: 1, multiplex: true })
      const reserve = Effect.scoped(Effect.map(pool.reserve, (connection) => connection.processId))
      const get = Effect.scoped(Effect.map(pool.get, (connection) => connection.processId))

      const first = yield* reserve
      assert.strictEqual(yield* get, first)
      assert.strictEqual(yield* reserve, first)
      assert.strictEqual(yield* get, first)
    }))

  it.effect("interrupt cancels an in-flight query", () =>
    Effect.gen(function*() {
      const pool = yield* PgPool.make(yield* poolConfig)
      const connection = yield* pool.get
      const other = yield* pool.get
      const fiber = yield* Effect.forkScoped(connection.query("SELECT pg_sleep(10)"))
      // Wait until the statement is running server side.
      while (true) {
        const active = yield* other.query(
          "SELECT count(*)::int4 AS active FROM pg_stat_activity WHERE pid = $1 AND state = 'active'",
          [connection.processId]
        )
        if (active.rows[0].active === 1) break
        yield* realSleep
      }
      yield* connection.interrupt
      const error = yield* Effect.flip(Fiber.join(fiber))
      assert.strictEqual(error._tag, "SqlError")
      assert.strictEqual(error.reason._tag, "StatementTimeoutError")

      // The connection survives the cancelled statement.
      const result = yield* connection.query("SELECT $1::int4 AS after", [2])
      assert.deepStrictEqual(result.rows, [{ after: 2 }])
    }))

  it.effect("replaces connections that die", () =>
    Effect.gen(function*() {
      const config = yield* poolConfig
      const pool = yield* PgPool.make({ ...config, maxConnections: 1 })
      const first = yield* Effect.scoped(Effect.map(pool.get, (connection) => connection.processId))
      const terminator = yield* PgConnection.make(config)
      yield* terminator.query("SELECT pg_terminate_backend($1)", [first])
      // The pool notices the dead connection asynchronously; retry until it
      // hands out a healthy replacement.
      while (true) {
        const replaced = yield* Effect.scoped(Effect.gen(function*() {
          const connection = yield* pool.get
          const alive = yield* Effect.isSuccess(connection.query("SELECT 1 AS one"))
          return alive && connection.processId !== first ? connection.processId : undefined
        }))
        if (replaced !== undefined) {
          assert.notStrictEqual(replaced, first)
          break
        }
        yield* realSleep
      }
    }))
})
