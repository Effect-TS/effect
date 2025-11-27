import * as NodeStream from "@effect/platform-node-shared/NodeStream"
import { assert, describe, it } from "@effect/vitest"
import { Array, Channel, Chunk, identity, pipe, Stream } from "effect"
import * as Effect from "effect/Effect"
import { Duplex, Readable, Transform } from "stream"
import { createGzip, createUnzip } from "zlib"

describe("Stream", () => {
  it("should read a stream", () =>
    Effect.gen(function*() {
      const stream = NodeStream.fromReadable<"error", string>(() => Readable.from(["a", "b", "c"]), () => "error")
      const items = yield* Stream.runCollect(stream)
      assert.deepEqual(
        Chunk.toReadonlyArray(items),
        ["a", "b", "c"]
      )
    }).pipe(Effect.runPromise))

  it("fromDuplex", () =>
    Effect.gen(function*() {
      const channel = NodeStream.fromDuplex<never, "error", string>(
        () =>
          new Transform({
            transform(chunk, _encoding, callback) {
              callback(null, chunk.toString().toUpperCase())
            }
          }),
        () => "error"
      )

      const items = yield* pipe(
        Stream.make("a", "b", "c"),
        Stream.pipeThroughChannelOrFail(channel),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      assert.deepEqual(
        Chunk.toReadonlyArray(items),
        ["ABC"]
      )
    }).pipe(Effect.runPromise))

  it("fromDuplex failure", () =>
    Effect.gen(function*() {
      const channel = NodeStream.fromDuplex<never, "error", string>(
        () =>
          new Transform({
            transform(_chunk, _encoding, callback) {
              callback(new Error())
            }
          }),
        () => "error"
      )

      const result = yield* pipe(
        Stream.make("a", "b", "c"),
        Stream.pipeThroughChannelOrFail(channel),
        Stream.runDrain,
        Effect.flip
      )

      assert.strictEqual(result, "error")
    }).pipe(Effect.runPromise))

  it("pipeThroughDuplex", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("a", "b", "c"),
        NodeStream.pipeThroughDuplex(
          () =>
            new Transform({
              transform(chunk, _encoding, callback) {
                callback(null, chunk.toString().toUpperCase())
              }
            }),
          () => "error" as const
        ),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      assert.deepEqual(
        Chunk.toReadonlyArray(result),
        ["ABC"]
      )
    }).pipe(Effect.runPromise))

  it("pipeThroughDuplex write error", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("a", "b", "c"),
        NodeStream.pipeThroughDuplex(
          () =>
            new Duplex({
              read() {
              },
              write(_chunk, _encoding, callback) {
                callback(new Error())
              }
            }),
          () => "error" as const
        ),
        Stream.runDrain,
        Effect.flip
      )

      assert.strictEqual(result, "error")
    }).pipe(Effect.runPromise))

  it("pipeThroughSimple", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make("a", Buffer.from("b"), "c"),
        NodeStream.pipeThroughSimple(
          () =>
            new Transform({
              transform(chunk, _encoding, callback) {
                callback(null, chunk.toString().toUpperCase())
              }
            })
        ),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )

      assert.deepEqual(
        Chunk.toReadonlyArray(result),
        ["ABC"]
      )
    }).pipe(Effect.runPromise))

  it("fromDuplex should work with node:zlib", () =>
    Effect.gen(function*() {
      const text = "abcdefg1234567890"
      const encoder = new TextEncoder()
      const input = encoder.encode(text)
      const stream = NodeStream.fromReadable<"error", Uint8Array>(() => Readable.from([input]), () => "error")
      const deflate = NodeStream.fromDuplex<"error", "error", Uint8Array>(() => createGzip(), () => "error")
      const inflate = NodeStream.fromDuplex<never, "error", Uint8Array>(() => createUnzip(), () => "error")
      const channel = Channel.pipeToOrFail(deflate, inflate)
      const items = yield* pipe(
        stream,
        Stream.pipeThroughChannelOrFail(channel),
        Stream.decodeText(),
        Stream.mkString,
        Stream.runCollect
      )
      assert.deepEqual(Chunk.toReadonlyArray(items), [text])
    }).pipe(Effect.runPromise))

  it("toReadable roundtrip", () =>
    Effect.gen(function*() {
      const stream = Stream.range(0, 10000).pipe(
        Stream.map((n) => String(n))
      )
      const readable = yield* NodeStream.toReadable(stream)
      const outStream = NodeStream.fromReadable<"error", Uint8Array>(() => readable, () => "error")
      const items = yield* pipe(
        outStream,
        Stream.decodeText(),
        Stream.runCollect
      )
      assert.strictEqual(Chunk.join(items, ""), Array.range(0, 10000).join(""))
    }).pipe(Effect.runPromise))

  it.effect("toReadable with error", () =>
    Effect.gen(function*() {
      const stream = Stream.fail("error")
      const readable = yield* NodeStream.toReadable(stream)
      const error = yield* NodeStream.fromReadable<unknown, Uint8Array>(
        () => readable,
        identity
      ).pipe(
        Stream.runDrain,
        Effect.flip
      )
      assert.deepEqual(error, "error")
    }))
})
