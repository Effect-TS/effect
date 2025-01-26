import { Socket, type SocketServer } from "@effect/platform"
import { NodeSocket, NodeSocketServer } from "@effect/platform-node"
import { assert, describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Queue, Stream } from "effect"
import { WS } from "vitest-websocket-mock"

const makeServer = Effect.gen(function*() {
  const server = yield* NodeSocketServer.make({ port: 0 })

  yield* server.run(Effect.fnUntraced(function*(socket) {
    const write = yield* socket.writer
    yield* socket.run(write)
  }, Effect.scoped)).pipe(Effect.forkScoped)

  return server
})

describe("Socket", () => {
  it.scoped("open", () =>
    Effect.gen(function*() {
      const server = yield* makeServer
      const channel = NodeSocket.makeNetChannel({ port: (server.address as SocketServer.TcpAddress).port })

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

    it.scoped("messages", () =>
      Effect.gen(function*() {
        const server = yield* makeServer
        const socket = yield* Socket.makeWebSocket(Effect.succeed(url))
        const messages = yield* Queue.unbounded<Uint8Array>()
        const fiber = yield* Effect.fork(socket.run((_) => messages.offer(_)))
        yield* Effect.gen(function*() {
          const write = yield* socket.writer
          yield* write(new TextEncoder().encode("Hello"))
          yield* write(new TextEncoder().encode("World"))
        }).pipe(Effect.scoped)
        yield* Effect.promise(async () => {
          await expect(server).toReceiveMessage(new TextEncoder().encode("Hello"))
          await expect(server).toReceiveMessage(new TextEncoder().encode("World"))
        })

        server.send("Right back at you!")
        let message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("Right back at you!"))

        server.send(new Blob(["A Blob message"]))
        message = yield* messages.take
        expect(message).toEqual(new TextEncoder().encode("A Blob message"))

        server.close()
        const exit = yield* fiber.await
        expect(exit._tag).toEqual("Success")
      }).pipe(
        Effect.provideService(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url))
      ))
  })

  describe("TransformStream", () => {
    it.scoped("works", () =>
      Effect.gen(function*() {
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
          Effect.scoped,
          Effect.forkScoped
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
