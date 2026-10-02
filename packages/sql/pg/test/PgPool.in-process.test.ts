import { PgPool } from "@effect/sql-pg"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Tracer } from "effect"
import * as Statement from "effect/sql/Statement"
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
  // A server that answers startup after `delayMs`, standing in for the TLS, auth
  // and startup round trips a real connect takes.
  const slowServer = (delayMs: number, onConnect: () => void = () => {}) => () => {
    onConnect()
    let startup = true
    const socket = new Duplex({
      read() {},
      write(_chunk: Buffer, _encoding, callback) {
        if (startup) {
          startup = false
          setTimeout(() => socket.push(ready), delayMs)
        }
        callback()
      }
    })
    return socket
  }

  const recording = () => {
    const spans: Array<Tracer.NativeSpan> = []
    const tracer = Tracer.make({
      span(options) {
        const span = new Tracer.NativeSpan(options)
        spans.push(span)
        return span
      }
    })
    const named = (name: string) => spans.filter((span) => span.name === name)
    const parentOf = (span: Tracer.NativeSpan) =>
      span.parent._tag === "Some"
        ? spans.find((candidate) => candidate.spanId === span.parent.pipe(Option.getOrThrow).spanId)
        : undefined
    return { tracer, named, parentOf }
  }

  const traced = <A, E, R>(effect: Effect.Effect<A, E, R>, tracer: Tracer.Tracer, propagate = true) =>
    effect.pipe(
      Effect.provideService(Tracer.Tracer, tracer),
      Effect.provideService(Statement.SpanPropagationEnabled, propagate)
    )

  it.live("reports the connect a checkout waited for under its span", () => {
    const { named, parentOf, tracer } = recording()
    return traced(
      Effect.scoped(Effect.gen(function*() {
        const pool = yield* PgPool.make({ username: "test", maxConnections: 1, stream: slowServer(40) })
        yield* Effect.scoped(pool.get).pipe(Effect.withSpan("first statement"))
        yield* Effect.scoped(pool.get).pipe(Effect.withSpan("second statement"))

        const [connect] = named("db.connect")
        const [first] = named("first statement")
        const [second] = named("second statement")
        assert.strictEqual(named("db.connect").length, 1)
        assert.strictEqual(parentOf(connect), first)
        assert.ok(connect.status._tag === "Ended" && first.status._tag === "Ended")
        assert.ok(connect.status.startTime >= first.status.startTime)
        assert.ok(Number(connect.attributes.get("db.client.connection.connect_time_ms")) >= 30)
        assert.ok(Number(first.attributes.get("db.client.connection.wait_time_ms")) >= 30)
        assert.ok(Number(second.attributes.get("db.client.connection.wait_time_ms")) < 30)
      })),
      tracer
    )
  })

  it.live("reports no connect for a session that was ready before the checkout", () => {
    const { named, tracer } = recording()
    let opened = 0
    return traced(
      Effect.scoped(Effect.gen(function*() {
        const pool = yield* PgPool.make({
          username: "test",
          minConnections: 1,
          maxConnections: 1,
          stream: slowServer(10, () => opened++)
        })
        yield* waitFor(() => opened === 1)
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 50)))
        yield* Effect.scoped(pool.get).pipe(Effect.withSpan("statement"))

        assert.strictEqual(named("db.connect").length, 0)
        assert.ok(named("statement")[0].attributes.has("db.client.connection.wait_time_ms"))
      })),
      tracer
    )
  })

  it.live("records nothing unless SpanPropagationEnabled is on", () => {
    const { named, tracer } = recording()
    return traced(
      Effect.scoped(Effect.gen(function*() {
        const pool = yield* PgPool.make({ username: "test", maxConnections: 1, stream: slowServer(10) })
        yield* Effect.scoped(pool.get).pipe(Effect.withSpan("statement"))

        assert.strictEqual(named("db.connect").length, 0)
        assert.isFalse(named("statement")[0].attributes.has("db.client.connection.wait_time_ms"))
      })),
      tracer,
      false
    )
  })
})
