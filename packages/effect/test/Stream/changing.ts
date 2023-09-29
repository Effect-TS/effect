import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("changes", () =>
    Effect.gen(function*($) {
      const stream = Stream.range(0, 19)
      const result = yield* $(
        stream,
        Stream.changes,
        Stream.runCollect
      )
      const expected = yield* $(
        stream,
        Stream.runCollect,
        Effect.map(Chunk.reduce(Chunk.empty<number>(), (acc, n) =>
          acc.length === 0 || Chunk.unsafeGet(acc, 0) !== n ? Chunk.append(acc, n) : acc))
      )
      assert.deepStrictEqual(Array.from(result), Array.from(expected))
    }))

  it.effect("changesWithEffect", () =>
    Effect.gen(function*($) {
      const stream = Stream.range(0, 19)
      const result = yield* $(
        stream,
        Stream.changesWithEffect((left, right) => Effect.succeed(left === right)),
        Stream.runCollect
      )
      const expected = yield* $(
        stream,
        Stream.runCollect,
        Effect.map(Chunk.reduce(Chunk.empty<number>(), (acc, n) =>
          acc.length === 0 || Chunk.unsafeGet(acc, 0) !== n ? Chunk.append(acc, n) : acc))
      )
      assert.deepStrictEqual(Array.from(result), Array.from(expected))
    }))
})
