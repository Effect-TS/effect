import * as MsgPack from "@effect/experimental/MsgPack"
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

describe("MsgPack", () => {
  test("socket", () =>
    Effect.gen(function*(_) {
      const platform = yield* _(Socket.SocketPlatform)
      const socket = platform.open({ port, host: "localhost" }).pipe(
        MsgPack.socket
      )

      const outputEffect = Stream.make({ hello: "world" }, { test: 123 }).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* _(outputEffect)

      assert.deepStrictEqual(Chunk.toArray(output), [{ hello: "world" }, { test: 123 }])
    }).pipe(Effect.provide(Socket.layer), Effect.runPromise))

  test("socket x10000", () =>
    Effect.gen(function*(_) {
      const platform = yield* _(Socket.SocketPlatform)
      const socket = platform.open({ port, host: "localhost" }).pipe(
        MsgPack.socket
      )
      const msgs = Array.from({ length: 10000 }, (_, i) => ({ hello: i }))

      const outputEffect = Stream.fromIterable(msgs).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* _(outputEffect)

      assert.deepStrictEqual(Chunk.toArray(output), msgs)
    }).pipe(Effect.provide(Socket.layer), Effect.runPromise))
})
