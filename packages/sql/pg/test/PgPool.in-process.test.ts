import { PgClient, PgPool } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { Duplex } from "node:stream"

const backendMessage = (tag: string, payload: Buffer): Buffer => {
  const length = Buffer.allocUnsafe(4)
  length.writeInt32BE(payload.length + 4)
  return Buffer.concat([Buffer.from(tag), length, payload])
}

const ready = Buffer.concat([
  backendMessage("R", Buffer.alloc(4)),
  backendMessage("K", Buffer.alloc(8)),
  backendMessage("Z", Buffer.from("I"))
])

const waitFor = (predicate: () => boolean) =>
  Effect.promise(async () => {
    for (let i = 0; i < 100 && !predicate(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    assert.ok(predicate(), "background acquisition did not start")
  })

describe("PgPool failed startup", () => {
  it.live(
    "retries a stale background acquisition rather than failing an unrelated checkout",
    () =>
      Effect.scoped(Effect.gen(function*() {
        let attempts = 0
        let backgroundStarted = false
        const pool = yield* PgPool.make({
          username: "test",
          connectTimeout: "250 millis",
          minConnections: 2,
          maxConnections: 2,
          stream: () => {
            attempts++
            const attempt = attempts
            let startup = true
            const socket = new Duplex({
              read() {},
              write(_chunk: Buffer, _encoding, callback) {
                if (startup) {
                  startup = false
                  if (attempt === 2) backgroundStarted = true
                  else queueMicrotask(() => socket.push(ready))
                }
                callback()
              }
            })
            return socket
          }
        })

        // Keep the healthy session leased so the failure becomes a placeholder.
        const healthy = yield* pool.get
        yield* waitFor(() => backgroundStarted)
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 400)))

        const replacement = yield* pool.get
        assert.notStrictEqual(replacement, healthy)
        assert.strictEqual(attempts, 3)
      })),
    10_000
  )

  it.live(
    "reports a caller-owned connect failure instead of retrying indefinitely",
    () =>
      Effect.scoped(Effect.gen(function*() {
        let attempts = 0
        const pool = yield* PgPool.make({
          username: "test",
          maxConnections: 1,
          stream: () => {
            attempts++
            const socket = new Duplex({ read() {}, write() {} })
            queueMicrotask(() => socket.destroy())
            return socket
          }
        })
        const result = yield* Effect.result(pool.get)
        assert.strictEqual(result._tag, "Failure")
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure.reason._tag, "ConnectionError")
          assert.strictEqual(result.failure.reason.operation, "connect")
        }
        assert.strictEqual(attempts, 1)
      })),
    10_000
  )
})

const readyStream = () => {
  const socket = new Duplex({
    read() {},
    write(_chunk: Buffer, _encoding, callback) {
      queueMicrotask(() => socket.push(ready))
      callback()
    }
  })
  return socket
}

describe("pool stats", () => {
  it.effect("counts a multiplexed session once however many fibers share it", () =>
    Effect.scoped(Effect.gen(function*() {
      const pool = yield* PgPool.make({ username: "test", multiplex: true, maxConnections: 2, stream: readyStream })
      yield* pool.get
      yield* pool.get
      yield* pool.get
      assert.deepStrictEqual(yield* pool.stats, { idle: 0, used: 1, pending: 0, min: 0, max: 2 })
    })))

  it.effect("PgClient.make reports the occupancy of its pool", () =>
    Effect.scoped(Effect.gen(function*() {
      const sql = yield* PgClient.make({ username: "test", maxConnections: 3, stream: readyStream })
      assert.deepStrictEqual(yield* sql.poolStats, { idle: 0, used: 0, pending: 0, min: 0, max: 3 })
      yield* Effect.scoped(Effect.gen(function*() {
        yield* sql.reserve
        assert.deepStrictEqual(yield* sql.poolStats, { idle: 0, used: 1, pending: 0, min: 0, max: 3 })
      }))
      assert.deepStrictEqual(yield* sql.poolStats, { idle: 1, used: 0, pending: 0, min: 0, max: 3 })
    })).pipe(Effect.provide(Reactivity.layer)))

  it.effect("PgClient.makeClient reports its one session as permanently leased", () =>
    Effect.scoped(Effect.gen(function*() {
      const sql = yield* PgClient.makeClient({ username: "test", stream: readyStream })
      // The snapshot describes the session, not statement activity, so it does
      // not change while work runs on it.
      const leased = { idle: 0, used: 1, pending: 0, min: 1, max: 1 }
      assert.deepStrictEqual(yield* sql.poolStats, leased)
      yield* Effect.scoped(Effect.gen(function*() {
        yield* sql.reserve
        assert.deepStrictEqual(yield* sql.poolStats, leased)
      }))
    })).pipe(Effect.provide(Reactivity.layer)))
})
