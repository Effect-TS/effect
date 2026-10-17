import { MysqlPool } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Fiber, Redacted } from "effect"
import { MysqlContainer, resultSet } from "./utils.ts"

const pool = (overrides: Partial<MysqlPool.Config> = {}) =>
  Effect.flatMap(MysqlContainer, (container) =>
    MysqlPool.make({
      url: Redacted.make(container.getConnectionUri()),
      ...overrides
    }))

/** The server's own id for a session, which is how we tell them apart. */
const idOf = (connection: { readonly connectionId: number }) => connection.connectionId

describe("MysqlPool", () => {
  it.layer(MysqlContainer.layer, { timeout: "120 seconds" })("against a real server", (it) => {
    it.effect("hands a released session back to the next caller", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 4 })
        const first = yield* Effect.scoped(Effect.map(p.get, idOf))
        const second = yield* Effect.scoped(Effect.map(p.get, idOf))
        assert.strictEqual(first, second)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("never lends one session to two callers at once", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 4 })
        // Held concurrently, so the pool cannot answer both with one session:
        // MySQL runs one command at a time per connection.
        const ids = yield* Effect.scoped(Effect.gen(function*() {
          const a = yield* p.get
          const b = yield* p.get
          return [idOf(a), idOf(b)]
        }))
        assert.notStrictEqual(ids[0], ids[1])
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("makes a caller wait once maxConnections are out", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 1 })
        const release = yield* Deferred.make<void>()
        const holding = yield* Deferred.make<void>()
        const holder = yield* Effect.forkChild(Effect.scoped(Effect.gen(function*() {
          yield* p.get
          yield* Deferred.succeed(holding, void 0)
          yield* Deferred.await(release)
        })))
        yield* Deferred.await(holding)

        const waiter = yield* Effect.forkChild(Effect.scoped(Effect.map(p.get, idOf)))
        // The single session is out, so the second checkout cannot be answered
        // until the first is given back.
        assert.strictEqual(waiter.pollUnsafe(), undefined)
        yield* Deferred.succeed(release, void 0)
        yield* Fiber.join(holder)
        assert.isNumber(yield* Fiber.join(waiter))
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("replaces a session that has been invalidated", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 2 })
        const first = yield* Effect.scoped(Effect.gen(function*() {
          const connection = yield* p.get
          yield* p.invalidate(connection)
          return idOf(connection)
        }))
        const second = yield* Effect.scoped(Effect.map(p.get, idOf))
        assert.notStrictEqual(first, second)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("retires a session after its TTL, so a zero TTL never reuses one", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 2, connectionTTL: 0 })
        // Every session is used once and then replaced.
        const first = yield* Effect.scoped(Effect.map(p.get, idOf))
        const second = yield* Effect.scoped(Effect.map(p.get, idOf))
        assert.notStrictEqual(first, second)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("takes a borrowed session back however the effect ends", () =>
      Effect.gen(function*() {
        const p = yield* pool({ minConnections: 0, maxConnections: 1 })
        const borrowed = yield* p.use((connection) => Effect.succeed(idOf(connection)))
        // A failure must return the session too, or the next borrow deadlocks
        // against a pool of one.
        yield* Effect.flip(p.use(() => Effect.fail("nope" as const)))
        const afterFailure = yield* p.use((connection) => Effect.succeed(idOf(connection)))
        assert.strictEqual(borrowed, afterFailure)
        // And so must an interruption.
        yield* Effect.forkChild(p.use(() => Effect.never)).pipe(Effect.flatMap(Fiber.interrupt))
        const afterInterrupt = yield* p.use((connection) => Effect.succeed(idOf(connection)))
        assert.strictEqual(borrowed, afterInterrupt)
      }).pipe(Effect.scoped), { timeout: 60_000 })

    it.effect("closes every session when the pool's scope closes", () =>
      Effect.gen(function*() {
        const probe = yield* pool({ minConnections: 0, maxConnections: 2 })
        const id = yield* Effect.scoped(Effect.gen(function*() {
          const p = yield* pool({ minConnections: 0, maxConnections: 2 })
          return yield* Effect.scoped(Effect.map(p.get, idOf))
        }))
        // The server drops a closed session, so its id is gone from the
        // process list once the pool's scope has closed.
        const live = yield* Effect.scoped(Effect.flatMap(
          probe.get,
          (connection) => connection.query(`SELECT COUNT(*) AS c FROM information_schema.processlist WHERE id = ${id}`)
        ))
        assert.strictEqual(resultSet(live[0]).rows[0].c, 0n)
      }).pipe(Effect.scoped), { timeout: 60_000 })
  })
})
