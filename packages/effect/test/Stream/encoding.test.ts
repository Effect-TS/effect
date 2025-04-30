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
})
