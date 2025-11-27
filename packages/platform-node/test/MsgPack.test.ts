import { MsgPack } from "@effect/platform"
import { NodeSocket } from "@effect/platform-node"
import { assert, describe, test } from "@effect/vitest"
import { Chunk, Effect, Stream } from "effect"
import * as Net from "node:net"

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
    Effect.gen(function*() {
      const socket = NodeSocket.makeNetChannel<MsgPack.MsgPackError>({ port, host: "localhost" }).pipe(
        MsgPack.duplex
      )

      const outputEffect = Stream.make({ hello: "world" }, { test: 123 }).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* outputEffect

      assert.deepStrictEqual(Chunk.toArray(output), [{ hello: "world" }, { test: 123 }])
    }).pipe(Effect.runPromise))

  test("socket x10000", () =>
    Effect.gen(function*() {
      const socket = NodeSocket.makeNetChannel<MsgPack.MsgPackError>({ port }).pipe(
        MsgPack.duplex
      )
      const msgs = Array.from({ length: 10000 }, (_, i) => ({ hello: i }))

      const outputEffect = Stream.fromIterable(msgs).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* outputEffect

      assert.deepStrictEqual(Chunk.toArray(output), msgs)
    }).pipe(Effect.runPromise))
})
