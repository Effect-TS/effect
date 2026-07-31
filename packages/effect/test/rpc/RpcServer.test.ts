import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Layer } from "effect"
import { RpcSerialization, RpcServer } from "effect/unstable/rpc"
import { Socket, SocketServer } from "effect/unstable/socket"

describe("RpcServer", () => {
  it.effect("closes a socket when the serialization buffer limit is exceeded", () =>
    Effect.scoped(
      Effect.gen(function*() {
        const handledChunks: Array<string> = []
        const writes: Array<Uint8Array | string | Socket.CloseEvent> = []
        const completed = yield* Deferred.make<void>()
        let closed = false

        const socket = Socket.make({
          runRaw: (handler) =>
            Effect.gen(function*() {
              for (const chunk of ["12", "34", "5", "{\"_tag\":\"Ping\"}\n"]) {
                if (closed) break
                handledChunks.push(chunk)
                const result = handler(chunk)
                if (Effect.isEffect(result)) {
                  yield* result
                }
              }
            }).pipe(Effect.ensuring(Deferred.succeed(completed, void 0))),
          writer: Effect.succeed((chunk) =>
            Effect.sync(() => {
              writes.push(chunk)
              if (Socket.isCloseEvent(chunk)) {
                closed = true
              }
            })
          )
        })
        const socketServer = SocketServer.SocketServer.of({
          address: {
            _tag: "TcpAddress",
            hostname: "localhost",
            port: 0
          },
          run: (handler) => handler(socket).pipe(Effect.orDie, Effect.andThen(Effect.never))
        })

        const protocol = yield* RpcServer.makeProtocolSocketServer.pipe(
          Effect.provide(Layer.succeed(SocketServer.SocketServer, socketServer)),
          Effect.provide(Layer.succeed(
            RpcSerialization.RpcSerialization,
            RpcSerialization.makeNdjson({ maxBufferSize: 4 })
          ))
        )
        yield* Effect.forkScoped(protocol.run(() => Effect.void))
        yield* Deferred.await(completed)

        assert.deepStrictEqual(handledChunks, ["12", "34", "5"])
        assert.strictEqual(writes.length, 1)
        const closeEvent = writes[0]
        assert(Socket.isCloseEvent(closeEvent))
        assert.strictEqual(closeEvent.code, 1009)
      })
    ))
})
