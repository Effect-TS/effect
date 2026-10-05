import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"
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
      return Socket.makeReader({
        pull: Effect.callback<[Uint8Array], Socket.SocketError>((next) => {
          resume = next
          return Effect.sync(() => {
            if (resume === next) resume = undefined
          })
        }),
        upgrade: Socket.SocketUpgradeError.unsupported
      })
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
  it.effect("forwards optional TLS record configuration and prevents changes after closure", () =>
    Effect.gen(function*() {
      const fixture = makeSocket()
      const sizes: Array<number> = []
      const socket = Socket.make({
        reader: fixture.socket.reader,
        writer: Effect.succeed({
          write: () => Effect.void,
          writeAll: () => Effect.void,
          setTlsMaxSendFragment: (size) =>
            Effect.sync(() => {
              sizes.push(size)
            })
        })
      })
      const connection = yield* SocketConnector.fromSocket(socket)
      yield* connection.setTlsMaxSendFragment!(4096)
      yield* connection.setTlsMaxSendFragment!(512)
      yield* connection.close
      assert.strictEqual((yield* Effect.flip(connection.setTlsMaxSendFragment!(1024))).reason._tag, "SocketCloseError")
      assert.deepStrictEqual(sizes, [4096, 512])
      assert.strictEqual((yield* SocketConnector.fromSocket(fixture.socket)).setTlsMaxSendFragment, undefined)
    }))

  it.effect("closes a pull-derived receive loop while its callback is suspended", () =>
    Effect.gen(function*() {
      const entered = yield* Deferred.make<void>()
      const stopped = yield* Deferred.make<void>()
      const socket = Socket.make({
        reader: Effect.succeed(Socket.makeReader({
          pull: Effect.succeed([new Uint8Array([1])] as const),
          upgrade: Socket.SocketUpgradeError.unsupported
        })),
        writer: Effect.succeed({ write: () => Effect.void, writeAll: () => Effect.void })
      })
      const connection = yield* SocketConnector.fromSocket(socket)
      const reading = yield* connection.run(() =>
        Deferred.succeed(entered, void 0).pipe(
          Effect.andThen(Effect.never),
          Effect.ensuring(Deferred.succeed(stopped, void 0))
        )
      ).pipe(Effect.flip, Effect.forkChild)
      yield* Deferred.await(entered)
      yield* connection.close
      assert.strictEqual((yield* Fiber.join(reading)).reason._tag, "SocketCloseError")
      yield* Deferred.await(stopped)
    }))

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
