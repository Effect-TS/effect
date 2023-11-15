import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("filter", () =>
    Effect.gen(function*($) {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => n % 2 === 0
      const { result1, result2 } = yield* $(Effect.all({
        result1: pipe(stream, Stream.filter(f), Stream.runCollect),
        result2: pipe(stream, Stream.runCollect, Effect.map(Chunk.filter(f)))
      }))
      assert.deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("filterEffect - simple example", () =>
    Effect.gen(function*($) {
      const stream = Stream.make(1, 2, 3, 4, 5)
      const f = (n: number) => Effect.succeed(n % 2 === 0)
      const { result1, result2 } = yield* $(Effect.all({
        result1: pipe(stream, Stream.filterEffect(f), Stream.runCollect),
        result2: pipe(stream, Stream.runCollect, Effect.flatMap(Effect.filter(f)))
      }))
      assert.deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("filterEffect - laziness on chunks", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.filterEffect((n) =>
          n === 3 ?
            Effect.fail("boom") :
            Effect.succeed(true)
        ),
        Stream.either,
        Stream.runCollect
      )
      assert.deepStrictEqual(
        Array.from(result),
        [Either.right(1), Either.right(2), Either.left("boom")]
      )
    }))
})
