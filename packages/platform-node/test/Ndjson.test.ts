import { Ndjson } from "@effect/platform"
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

describe("Ndjson", () => {
  test("socket", () =>
    Effect.gen(function*() {
      const socket = NodeSocket.makeNetChannel<Ndjson.NdjsonError>({ port, host: "localhost" }).pipe(
        Ndjson.duplex()
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
      const socket = NodeSocket.makeNetChannel<Ndjson.NdjsonError>({ port }).pipe(
        Ndjson.duplex()
      )
      const msgs = Array.from({ length: 10000 }, (_, i) => ({ hello: i }))

      const outputEffect = Stream.fromIterable(msgs).pipe(
        Stream.pipeThroughChannel(socket),
        Stream.runCollect
      )
      const output = yield* outputEffect

      assert.deepStrictEqual(Chunk.toArray(output), msgs)
    }).pipe(Effect.runPromise))

  test("should ignore empty lines", () =>
    Effect.gen(function*() {
      const encoder = new TextEncoder()

      const ndjson = [
        "{\"id\":\"1\"}",
        "{\"id\":\"2\"}",
        "\n",
        "{\"id\":\"3\"}",
        "{\"id\":\"4\"}"
      ].join("\n")

      const results = yield* Stream.succeed(encoder.encode(ndjson)).pipe(
        Stream.pipeThroughChannel(Ndjson.unpack({ ignoreEmptyLines: true })),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )

      assert.deepStrictEqual(results, [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }])
    }).pipe(Effect.runPromise))

  test("should not ignore empty lines", () =>
    Effect.gen(function*() {
      const encoder = new TextEncoder()

      const ndjson = [
        "{\"id\":\"1\"}",
        "{\"id\":\"2\"}",
        "\n",
        "{\"id\":\"3\"}",
        "{\"id\":\"4\"}"
      ].join("\n")

      const error = yield* Stream.succeed(encoder.encode(ndjson)).pipe(
        Stream.pipeThroughChannel(Ndjson.unpack()),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.flip
      )

      assert.instanceOf(error, Ndjson.NdjsonError)
      assert.propertyVal(error, "reason", "Unpack")
    }).pipe(Effect.runPromise))
})
