import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("raceAll", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.raceAll(
          Stream.make(0, 1, 2, 3),
          Stream.make(4, 5, 6, 7),
          Stream.make(7, 8, 9, 10)
        ),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      assert.deepStrictEqual(result, [0, 1, 2, 3])
    }))
})
