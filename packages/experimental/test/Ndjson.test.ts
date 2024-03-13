import * as Ndjson from "@effect/experimental/Ndjson"
import * as Socket from "@effect/platform-node/NodeSocket"
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

describe("Ndjson", () => {
  test("socket", () =>
    Effect.gen(function*(_) {
      const socket = Socket.makeNetChannel<Ndjson.NdjsonError>({ port, host: "localhost" }).pipe(
        Ndjson.duplex
      )

      const outputEffect = Stream.make({ hello: "world" }, { test: 123 }).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* _(outputEffect)

      assert.deepStrictEqual(Chunk.toArray(output), [{ hello: "world" }, { test: 123 }])
    }).pipe(Effect.runPromise))

  test("socket x10000", () =>
    Effect.gen(function*(_) {
      const socket = Socket.makeNetChannel<Ndjson.NdjsonError>({ port }).pipe(
        Ndjson.duplex
      )
      const msgs = Array.from({ length: 10000 }, (_, i) => ({ hello: i }))

      const outputEffect = Stream.fromIterable(msgs).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* _(outputEffect)

      assert.deepStrictEqual(Chunk.toArray(output), msgs)
    }).pipe(Effect.runPromise))
})
