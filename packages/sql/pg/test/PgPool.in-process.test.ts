import { PgClient, PgPool } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
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

const emptyQueryResult = Buffer.concat([
  backendMessage("1", Buffer.alloc(0)),
  backendMessage("2", Buffer.alloc(0)),
  backendMessage("n", Buffer.alloc(0)),
  backendMessage("C", Buffer.from("SELECT 0\0")),
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

describe("PgPool acquireTimeout", () => {
  it.live("fails a checkout that waits on an exhausted pool past acquireTimeout", () =>
    Effect.gen(function*() {
      const sql = yield* PgClient.make({
        username: "test",
        maxConnections: 1,
        acquireTimeout: "100 millis",
        stream: () => {
          const socket = new Duplex({
            read() {},
            write(_chunk: Buffer, _encoding, callback) {
              queueMicrotask(() => socket.push(ready))
              callback()
            }
          })
          return socket
        }
      })
      yield* sql.reserve

      const statement = yield* Effect.flip(sql`SELECT 1`)
      assert.strictEqual(statement.reason._tag, "ConnectionError")
      assert.strictEqual(statement.reason.operation, "acquireConnection")
      const transaction = yield* Effect.flip(sql.withTransaction(sql`SELECT 1`))
      assert.strictEqual(transaction.reason._tag, "ConnectionError")
      assert.strictEqual(transaction.reason.operation, "acquireConnection")
    }).pipe(
      Effect.scoped,
      Effect.provide(Reactivity.layer)
    ), 10_000)

  it.live(
    "fails a multiplexed reservation that waits on a busy pipeline past acquireTimeout",
    () =>
      Effect.gen(function*() {
        let socket!: Duplex
        let writes = 0
        const sql = yield* PgClient.make({
          username: "test",
          maxConnections: 1,
          multiplex: true,
          acquireTimeout: "100 millis",
          stream: () => {
            socket = new Duplex({
              read() {},
              write(_chunk: Buffer, _encoding, callback) {
                if (++writes === 1) queueMicrotask(() => socket.push(ready))
                callback()
              }
            })
            return socket
          }
        })
        // The shared statement stays on the wire until the backend answers it.
        const busy = yield* Effect.forkChild(sql`SELECT 1`)
        yield* waitFor(() => writes === 2)

        // The failed reservation shares the test scope, which stays open.
        const error = yield* Effect.flip(sql.reserve)
        assert.strictEqual(error.reason._tag, "ConnectionError")
        assert.strictEqual(error.reason.operation, "acquireConnection")

        socket.push(emptyQueryResult)
        yield* Fiber.join(busy)
        yield* Effect.scoped(sql.reserve)
      }).pipe(
        Effect.scoped,
        Effect.provide(Reactivity.layer)
      ),
    10_000
  )
})
