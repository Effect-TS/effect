import { PgPool } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Option, Queue, Tracer } from "effect"
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

  it.effect("reports the connect a statement waited for under its span, only with propagation", () => {
    const { named, tracer } = recording()
    const checkouts = Effect.scoped(Effect.gen(function*() {
      const server = yield* heldServer
      const pool = yield* PgPool.make({ username: "test", maxConnections: 1, stream: server.stream })
      const first = yield* Effect.forkChild(Effect.scoped(pool.get).pipe(Effect.withSpan("first statement")))
      const answer = yield* Queue.take(server.startups)
      yield* TestClock.adjust("40 millis")
      yield* answer
      yield* Fiber.join(first)
      yield* Effect.scoped(pool.get).pipe(Effect.withSpan("second statement"))
    }))
    return Effect.gen(function*() {
      yield* traced(checkouts, tracer, true)
      yield* traced(checkouts, tracer, false)

      const connects = named("db.connect")
      const [first] = named("first statement")
      assert.strictEqual(connects.length, 1)
      const [connect] = connects
      assert.strictEqual(Option.getOrThrow(connect.parent).spanId, first.spanId)
      assert.strictEqual(connect.status.startTime, first.status.startTime)
      assert.strictEqual(connect.attributes.get("db.client.connection.connect_time_ms"), 40)
    })
  })

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
