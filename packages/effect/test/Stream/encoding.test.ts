import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import { describe, expect } from "vitest"

describe("Stream", () => {
  it.effect("decodeText/encodeText round trip", () =>
    Effect.gen(function*(_) {
      const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
      const encoded = yield* pipe(
        Stream.fromIterable(items),
        Stream.encodeText,
        Stream.runCollect
      )
      expect(encoded.length).toEqual(9)
      const decoded = yield* pipe(
        Stream.fromChunk(encoded),
        Stream.decodeText(),
        Stream.runCollect
      )
      expect(Chunk.toReadonlyArray(decoded)).toEqual(items)
    }))
})
