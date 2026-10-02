import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Scope } from "effect"
import * as Socket from "effect/socket/Socket"
import * as SocketConnector from "effect/socket/SocketConnector"

const makeSocket = () => {
  let opens = 0
  const writes: Array<string | Uint8Array | Socket.CloseEvent> = []
  const socket = Socket.make({
    reader: Effect.gen(function*() {
      opens++
      let resume: ((effect: Effect.Effect<[Uint8Array], Socket.SocketError>) => void) | undefined
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          resume?.(Effect.fail(new Socket.SocketError({ reason: new Socket.SocketCloseError({ code: 1006 }) })))
        })
      )
      return {
        pull: Effect.callback<[Uint8Array], Socket.SocketError>((next) => {
          resume = next
          return Effect.sync(() => {
            if (resume === next) resume = undefined
          })
        }),
        upgrade: Socket.SocketUpgradeError.unsupported
      }
    }),
    writer: Effect.succeed({
      write: (chunk) =>
        Effect.sync(() => {
          writes.push(chunk)
        }),
      writeAll: (chunks) =>
        Effect.sync(() => {
          writes.push(...chunks)
        })
    })
  })
  return { socket, writes, opens: () => opens }
}

describe("SocketConnector", () => {
  it.effect("acquires one session and prevents writes after closing it", () =>
    Effect.gen(function*() {
      const fixture = makeSocket()
      const connection = yield* SocketConnector.fromSocket(fixture.socket)
      yield* connection.write("first")
      yield* connection.close
      const error = yield* connection.write("second").pipe(Effect.flip)
      assert.strictEqual(error.reason._tag, "SocketCloseError")
      assert.deepStrictEqual(fixture.writes, ["first"])
      assert.strictEqual(fixture.opens(), 1)
    }))

  it.effect("terminates a suspended pull when the owning scope closes", () =>
    Effect.gen(function*() {
      const fixture = makeSocket()
      const scope = yield* Scope.make()
      const connection = yield* SocketConnector.fromSocket(fixture.socket).pipe(Scope.provide(scope))
      const reading = yield* connection.pull.pipe(Effect.flip, Effect.forkChild)
      yield* Effect.yieldNow
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "SocketCloseError")
      assert.strictEqual((yield* connection.write("late").pipe(Effect.flip)).reason._tag, "SocketCloseError")
      assert.deepStrictEqual(fixture.writes, [])
    }))
})
