import { assert, it } from "@effect/vitest"
import { Effect, Exit, Queue, Scope } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { Duplex } from "node:stream"
import { makeClient, makeSingleClient } from "./transport.ts"

it.effect("withTransaction surfaces stream factory failures instead of defecting", () =>
  Effect.gen(function*() {
    const sql = yield* makeClient({
      username: "test",
      stream: () => {
        throw new Error("stream factory failed")
      }
    })

    const error = yield* Effect.flip(sql.withTransaction(sql`SELECT 1`))

    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(error.reason.operation, "connect")
  }).pipe(
    Effect.scoped,
    Effect.provide(Reactivity.layer)
  ))

it.effect("withTransaction surfaces startup transport failures instead of defecting", () =>
  Effect.gen(function*() {
    const sql = yield* makeClient({
      username: "test",
      stream: () =>
        new Duplex({
          read() {},
          write(_chunk, _encoding, callback) {
            callback(new Error("startup write failed"))
          }
        })
    })

    const error = yield* Effect.flip(sql.withTransaction(sql`SELECT 1`))

    assert.strictEqual(error.reason._tag, "ConnectionError")
    assert.strictEqual(error.reason.operation, "connect")
  }).pipe(
    Effect.scoped,
    Effect.provide(Reactivity.layer)
  ))

it.effect("releases side sessions in the listener's scope", () =>
  Effect.gen(function*() {
    const closed = new Set<number>()
    let sessions = 0
    const startup = Uint8Array.from(Buffer.from("5200000008000000004b0000000c00000001000000025a0000000549", "hex"))
    const query = Uint8Array.from(
      Buffer.from("310000000432000000046e00000004430000000b4c495354454e005a0000000549", "hex")
    )
    const sql = yield* makeSingleClient({
      username: "test",
      acquireForStream: true,
      connector: () =>
        Effect.gen(function*() {
          const session = ++sessions
          const incoming = yield* Queue.unbounded<Uint8Array>()
          return {
            pull: Effect.map(Queue.take(incoming), (chunk) => [chunk] as const),
            run: (onChunk) =>
              Effect.forever(Effect.flatMap(Queue.take(incoming), (chunk) => onChunk(chunk) ?? Effect.void)),
            upgrade: () => Effect.void,
            write: (chunk) =>
              Effect.sync(() => {
                if (chunk instanceof Uint8Array && chunk[0] !== 0x58) Queue.offerUnsafe(incoming, startup)
              }),
            writeAll: () =>
              Effect.sync(() => {
                Queue.offerUnsafe(incoming, query)
              }),
            close: Effect.sync(() => {
              closed.add(session)
            })
          }
        })
    })
    const listenerScope = yield* Scope.fork(yield* Effect.scope)
    yield* Scope.provide(sql.listen("scope_test"), listenerScope)
    assert.strictEqual(sessions, 2)
    yield* Scope.close(listenerScope, Exit.void)
    assert.isTrue(closed.has(2))
    assert.isFalse(closed.has(1))
  }).pipe(Effect.provide(Reactivity.layer)))
