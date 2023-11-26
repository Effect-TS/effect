import * as Socket from "@effect/experimental/Socket/Node"
import { Chunk, Effect, Stream } from "effect"
import * as Net from "node:net"
import { assert, describe, test } from "vitest"

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
      const platform = yield* _(Socket.SocketPlatform)
      const socket = platform.open({ port, host: "localhost" })

      const outputEffect = Stream.make("Hello", "World").pipe(
        Stream.encodeText,
        Stream.pipeThroughChannel(socket),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      const output = yield* _(outputEffect)
      assert.strictEqual(Chunk.join(output, ""), "HelloWorld")
    }).pipe(Effect.provide(Socket.layer), Effect.runPromise))
})
