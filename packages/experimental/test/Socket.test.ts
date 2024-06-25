import * as SocketServer from "@effect/experimental/SocketServer/Node"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Socket from "@effect/platform/Socket"
import { assert, describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Fiber, pipe, Queue, Stream } from "effect"
import WS from "vitest-websocket-mock"

const makeServer = Effect.gen(function*(_) {
  const server = yield* SocketServer.make({ port: 0 })

  yield* pipe(
    server.run((socket) =>
      Effect.gen(function*(_) {
        const write = yield* socket.writer
        yield* socket.run(write)
      }).pipe(Effect.scoped)
    ),
    Effect.forkScoped
  )

  return server
})

describe("Socket", () => {
  it.scoped("open", () =>
    Effect.gen(function*(_) {
      const server = yield* makeServer
      const address = yield* server.address
      const channel = NodeSocket.makeNetChannel({ port: (address as SocketServer.TcpAddress).port })

      const outputEffect = Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(channel),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      const output = yield* outputEffect
      assert.strictEqual(Chunk.join(output, ""), "HelloWorld")
    }))

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

    it.effect("messages", () =>
      Effect.gen(function*(_) {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))
        yield* pipe(
          Effect.gen(function*(_) {
            const write = yield* socket.writer
            yield* write(new TextEncoder().encode("Hello"))
            yield* write(new TextEncoder().encode("World"))
          }),
          Effect.scoped
        )
        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Hello"))
          await expect(server).toReceiveMessage(new TextEncoder().encode("World"))
        })

        server.send("Right back at you!")
        const message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("Right back at you!"))

        server.close()
        const exit = yield* pipe(Fiber.join(fiber), Effect.exit)
        expect(exit._tag).toEqual("Success")
      }).pipe(
        Effect.scoped,
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))
  })

  describe("TransformStream", () => {
    it.effect("works", () =>
      Effect.gen(function*(_) {
        const readable = Stream.make("A", "B", "C").pipe(
          Stream.tap(() => Effect.sleep(50)),
          Stream.toReadableStream()
        )
        const decoder = new TextDecoder()
        const chunks: Array<string> = []
        const writable = new WritableStream<Uint8Array>({
          write(chunk) {
            chunks.push(decoder.decode(chunk))
          }
        })

        const socket = yield* Socket.fromTransformStream(Effect.succeed({
          readable,
          writable
        }))
        yield* socket.writer.pipe(
          Effect.tap((write) =>
            write("Hello").pipe(
              Effect.zipRight(write("World"))
            )
          ),
          Effect.scoped
        )
        const received: Array<string> = []
        yield* socket.run((chunk) =>
          Effect.sync(() => {
            received.push(decoder.decode(chunk))
          })
        ).pipe(Effect.scoped)

        assert.deepStrictEqual(chunks, ["Hello", "World"])
        assert.deepStrictEqual(received, ["A", "B", "C"])
      }))
  })
})
