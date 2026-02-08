import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"

describe("Stream", () => {
  it.effect("decodeText/encodeText round trip", () =>
    Effect.gen(function*() {
      const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
      const encoded = yield* pipe(
        Stream.fromIterable(items),
        Stream.encodeText,
        Stream.runCollect
      )
      strictEqual(encoded.length, 9)
      const decoded = yield* pipe(
        Stream.fromChunk(encoded),
        Stream.decodeText(),
        Stream.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(decoded), items)
    }))

  it.effect("decodeText handles multi-byte characters split across chunks", () =>
    Effect.gen(function*() {
      // 🌍 is U+1F30D — four UTF-8 bytes: [0xF0, 0x9F, 0x8C, 0x8D]
      const bytes = new TextEncoder().encode("🌍")

      // Split the bytes mid-character across two chunks
      const stream = Stream.fromChunks(
        Chunk.of(bytes.slice(0, 2)), // [0xF0, 0x9F]
        Chunk.of(bytes.slice(2, 4)) // [0x8C, 0x8D]
      )

      const result = yield* pipe(
        stream,
        Stream.decodeText(),
        Stream.mkString
      )

      strictEqual(result, "🌍")
    }))

  it.effect("decodeText handles mixed ASCII and multi-byte characters across chunks", () =>
    Effect.gen(function*() {
      // "Hello 🌍!" encoded as UTF-8
      const bytes = new TextEncoder().encode("Hello 🌍!")

      // Split in the middle of the emoji (after "Hello " + first 2 bytes of emoji)
      const splitPoint = 6 + 2 // "Hello " is 6 bytes, then 2 of 4 emoji bytes
      const stream = Stream.fromChunks(
        Chunk.of(bytes.slice(0, splitPoint)),
        Chunk.of(bytes.slice(splitPoint))
      )

      const result = yield* pipe(
        stream,
        Stream.decodeText(),
        Stream.mkString
      )

      strictEqual(result, "Hello 🌍!")
    }))
})
