import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { deepStrictEqual, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Stream", () => {
  it.effect("decodeText/encodeText round trip", () =>
    Effect.gen(function*(_) {
      const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i"]
      const encoded = yield* _(
        Stream.fromIterable(items),
        Stream.encodeText,
        Stream.runCollect
      )
      strictEqual(encoded.length, 9)
      const decoded = yield* _(
        Stream.fromChunk(encoded),
        Stream.decodeText(),
        Stream.runCollect
      )
      deepStrictEqual(Chunk.toReadonlyArray(decoded), items)
    }))
})
