import { PgClient, PgPool } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Option, Queue, References, Tracer } from "effect"
import type * as Duration from "effect/Duration"
import * as Reactivity from "effect/reactivity/Reactivity"
import type * as Scope from "effect/Scope"
import type { SqlError } from "effect/sql/SqlError"
import * as Statement from "effect/sql/Statement"
import * as TestClock from "effect/testing/TestClock"
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

describe("PgPool connection spans", () => {
  // A server that holds each connection's startup until the test answers it, so
  // the test decides when a connect finishes and the TestClock decides how long
  // it took.
  const heldServer = Effect.map(Queue.unbounded<Effect.Effect<void>>(), (startups) => ({
    startups,
    stream: () => {
      let startup = true
      const socket = new Duplex({
        read() {},
        write(_chunk: Buffer, _encoding, callback) {
          if (startup) {
            startup = false
            Queue.offerUnsafe(startups, Effect.sync(() => socket.push(ready)))
          }
          callback()
        }
      })
      return socket
    }
  }))

  const recording = () => {
    const spans: Array<Tracer.NativeSpan> = []
    const tracer = Tracer.make({
      span(options) {
        const span = new Tracer.NativeSpan(options)
        spans.push(span)
        return span
      }
    })
    return { tracer, named: (name: string) => spans.filter((span) => span.name === name) }
  }

  const traced = <A, E, R>(effect: Effect.Effect<A, E, R>, tracer: Tracer.Tracer, propagate: boolean) =>
    effect.pipe(Effect.withTracer(tracer), Effect.provideService(Statement.SpanPropagationEnabled, propagate))

  // Runs a statement whose checkout opens the pool's first session, answers the
  // connect after 40 ms, then runs a second statement on the same session.
  const firstCheckout = (
    checkout: (pool: PgPool.PgPool) => Effect.Effect<unknown, SqlError, Scope.Scope>,
    options: {
      readonly acquireTimeout?: Duration.Input | undefined
      readonly propagate?: boolean
      readonly timing?: boolean
    } = {}
  ) => {
    const { named, tracer } = recording()
    return Effect.scoped(Effect.gen(function*() {
      const server = yield* heldServer
      const pool = yield* PgPool.make({
        username: "test",
        maxConnections: 1,
        acquireTimeout: options.acquireTimeout,
        stream: server.stream
      })
      const first = yield* Effect.forkChild(Effect.scoped(checkout(pool)).pipe(Effect.withSpan("first statement")))
      const answer = yield* Queue.take(server.startups)
      yield* TestClock.adjust("40 millis")
      yield* answer
      yield* Fiber.join(first)
      yield* Effect.scoped(pool.get).pipe(Effect.withSpan("second statement"))
      return { connects: named("db.connect"), first: named("first statement")[0] }
    })).pipe(
      Effect.provideService(References.TracerTimingEnabled, options.timing ?? true),
      (effect) => traced(effect, tracer, options.propagate ?? true)
    )
  }

  it.effect("reports the connect a statement waited for under its span, only with propagation and timing", () =>
    Effect.gen(function*() {
      const use = (pool: PgPool.PgPool) => pool.use(() => Effect.void)
      for (
        const [checkout, acquireTimeout] of [
          [use, undefined],
          [use, "1 second"],
          [(pool: PgPool.PgPool) => pool.reserve, undefined]
        ] as const
      ) {
        const { connects, first } = yield* firstCheckout(checkout, { acquireTimeout })
        assert.strictEqual(connects.length, 1)
        const [connect] = connects
        assert.strictEqual(Option.getOrThrow(connect.parent).spanId, first.spanId)
        assert.strictEqual(connect.status.startTime, first.status.startTime)
        assert.strictEqual(connect.attributes.get("db.client.connection.connect_time_ms"), 40)
      }
      assert.strictEqual((yield* firstCheckout(use, { propagate: false })).connects.length, 0)
      assert.strictEqual((yield* firstCheckout(use, { timing: false })).connects.length, 0)
    }))

  it.live("reports no connect for a session that was ready before the statement", () => {
    const { named, tracer } = recording()
    return traced(
      Effect.scoped(Effect.gen(function*() {
        const server = yield* heldServer
        const pool = yield* PgPool.make({
          username: "test",
          minConnections: 1,
          maxConnections: 2,
          stream: server.stream
        })
        yield* Effect.flatten(Queue.take(server.startups))
        // A background session gives no signal when its handshake lands, so this
        // waits for it the way the failed-startup tests above do.
        yield* Effect.sleep("50 millis")
        yield* Effect.scoped(Effect.gen(function*() {
          yield* pool.get.pipe(Effect.withSpan("ready statement"))
          const waiting = yield* Effect.forkChild(Effect.scoped(pool.get).pipe(Effect.withSpan("waiting statement")))
          yield* Effect.flatten(Queue.take(server.startups))
          yield* Fiber.join(waiting)
        }))

        const connects = named("db.connect")
        assert.strictEqual(connects.length, 1)
        assert.strictEqual(Option.getOrThrow(connects[0].parent).spanId, named("waiting statement")[0].spanId)
      })),
      tracer,
      true
    )
  })
})
