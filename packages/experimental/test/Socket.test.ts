import * as Socket from "@effect/experimental/Socket/Node"
import { Chunk, Effect, Stream } from "effect"
import * as Net from "node:net"
import { assert, describe, expect, test } from "vitest"
import WS from "vitest-websocket-mock"

const server = Net.createServer((socket) => {
  socket.on("data", (data) => {
    socket.write(data)
  })
  socket.on("end", () => {
    socket.end()
  })
})
let port = 0
server.listen({
  port: 0
}, () => {
  port = (server.address() as Net.AddressInfo).port
})

describe("Socket", () => {
  test("open", () =>
    Effect.gen(function*(_) {
      const channel = Socket.makeNetChannel({ port })

      const outputEffect = Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(channel),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      const output = yield* _(outputEffect)
      assert.strictEqual(Chunk.join(output, ""), "HelloWorld")
    }).pipe(Effect.runPromise))

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
        const socket = yield* _(Socket.makeWebSocket(url))
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
        const message = yield* _(socket.pull)
        expect(message).toEqual(new TextEncoder().encode("Right back at you!"))

        server.close()
        const err = yield* _(socket.pull, Effect.flip)
        expect(err._tag).toEqual("None")
      }).pipe(Effect.scoped, Effect.runPromise))
  })
})
