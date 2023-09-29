import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { constTrue, pipe } from "effect/Function"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("transduce - simple example", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make("1", "2", ",", "3", "4"),
        Stream.transduce(
          pipe(
            Sink.collectAllWhile((char: string) => Number.isInteger(Number.parseInt(char))),
            Sink.zipLeft(Sink.collectAllWhile((char: string) => !Number.isInteger(Number.parseInt(char))))
          )
        ),
        Stream.map(Chunk.join("")),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), ["12", "34"])
    }))

  it.effect("transduce - no remainder", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3, 4),
        Stream.transduce(Sink.fold(100, (n) => n % 2 === 0, (acc, n) => acc + n)),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), [101, 105, 104])
    }))

  it.effect("transduce - with a sink that always signals more", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.transduce(Sink.fold(0, constTrue, (acc, n) => acc + n)),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), [6])
    }))

  it.effect("transduce - propagates scope error", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.transduce(Sink.fail("Woops")),
        Stream.runCollect,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("Woops"))
    }))
})
