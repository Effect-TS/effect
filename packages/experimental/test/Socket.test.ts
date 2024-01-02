import * as Socket from "@effect/experimental/Socket/Node"
import * as SocketServer from "@effect/experimental/SocketServer/Node"
import { Chunk, Effect, Fiber, Queue, Stream } from "effect"
import { assert, describe, expect, test } from "vitest"
import WS from "vitest-websocket-mock"

const makeServer = Effect.gen(function*(_) {
  const server = yield* _(SocketServer.make({ port: 0 }))

  yield* _(
    server.run((socket) =>
      Effect.gen(function*(_) {
        const write = yield* _(socket.writer)
        yield* _(socket.run(write))
      }).pipe(Effect.scoped)
    ),
    Effect.forkScoped
  )

  return server
})

describe("Socket", () => {
  test("open", () =>
    Effect.gen(function*(_) {
      const server = yield* _(makeServer)
      const address = yield* _(server.address)
      const channel = Socket.makeNetChannel({ port: (address as SocketServer.TcpAddress).port })

      const outputEffect = Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(channel),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      const output = yield* _(outputEffect)
      assert.strictEqual(Chunk.join(output, ""), "HelloWorld")
    }).pipe(Effect.scoped, Effect.runPromise))

  describe("WebSocket", () => {
    const url = `ws://localhost:1234`

    const makeServer = Effect.acquireRelease(
      Effect.sync(() => new WS(url)),
      (ws) =>
        Effect.sync(() => {
          ws.close()
          WS.clean()
        })
    )

    test("messages", () =>
      Effect.gen(function*(_) {
        const server = yield* _(makeServer)
        const socket = yield* _(Socket.makeWebSocket(Effect.succeed(url)))
        const messages = yield* _(Queue.unbounded<Uint8Array>())
        const fiber = yield* _(Effect.fork(socket.run((_) => messages.offer(_))))
        yield* _(
          Effect.gen(function*(_) {
            const write = yield* _(socket.writer)
            yield* _(write(new TextEncoder().encode("Hello")))
            yield* _(write(new TextEncoder().encode("World")))
          }),
          Effect.scoped
        )
        yield* _(Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Hello"))
          await expect(server).toReceiveMessage(new TextEncoder().encode("World"))
        }))

        server.send("Right back at you!")
        const message = yield* _(messages.take)
        expect(message).toEqual(new TextEncoder().encode("Right back at you!"))

        server.close()
        const exit = yield* _(Fiber.join(fiber), Effect.exit)
        expect(exit._tag).toEqual("Success")
      }).pipe(Effect.scoped, Effect.runPromise))
  })
})
