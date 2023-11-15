import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("every", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.make(1, 2, 3, 4, 5)
      const predicate = (n: number) => n < 6
      const result = yield* $(
        Stream.fromChunk(chunk),
        Stream.run(Sink.every(predicate))
      )
      assert.isTrue(result)
    }))

  it.effect("head", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.fromChunks(Chunk.range(1, 10), Chunk.range(1, 3), Chunk.range(2, 5)),
        Stream.run(Sink.head())
      )
      assert.deepStrictEqual(result, Option.some(1))
    }))

  it.effect("last", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.fromChunks(Chunk.range(1, 10), Chunk.range(1, 3), Chunk.range(2, 5)),
        Stream.run(Sink.last())
      )
      assert.deepStrictEqual(result, Option.some(5))
    }))

  it.effect("take - repeats until the source is exhausted", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.fromChunks(
          Chunk.make(1, 2),
          Chunk.make(3, 4, 5),
          Chunk.empty<number>(),
          Chunk.make(6, 7),
          Chunk.make(8, 9)
        ),
        Stream.run(Sink.collectAllFrom(Sink.take<number>(3)))
      )
      assert.deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2, 3], [4, 5, 6], [7, 8, 9], []]
      )
    }))

  it.effect("some", () =>
    Effect.gen(function*($) {
      const chunk = Chunk.make(1, 2, 3, 4, 5)
      const predicate = (n: number) => n === 3
      const result = yield* $(
        Stream.fromChunk(chunk),
        Stream.run(Sink.some(predicate))
      )
      assert.isTrue(result)
    }))

  it.effect("sum", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.fromChunks(
          Chunk.make(1, 2),
          Chunk.make(3, 4, 5),
          Chunk.empty<number>(),
          Chunk.make(6, 7),
          Chunk.make(8, 9)
        ),
        Stream.run(pipe(
          Sink.collectAllFrom(Sink.sum),
          Sink.map(Chunk.reduce(0, (x, y) => x + y))
        ))
      )
      assert.strictEqual(result, 45)
    }))

  it.effect("take", () =>
    Effect.gen(function*($) {
      const n = 4
      const chunks = Chunk.make(
        Chunk.make(1, 2),
        Chunk.make(3, 4, 5),
        Chunk.empty<number>(),
        Chunk.make(6, 7),
        Chunk.make(8, 9)
      )
      const [chunk, leftover] = yield* $(
        Stream.fromChunks(...chunks),
        Stream.peel(Sink.take<number>(n)),
        Effect.flatMap(([chunk, stream]) =>
          pipe(
            Stream.runCollect(stream),
            Effect.map((leftover) => [chunk, leftover] as const)
          )
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(
        Array.from(chunk),
        Array.from(pipe(Chunk.flatten(chunks), Chunk.take(n)))
      )
      assert.deepStrictEqual(
        Array.from(leftover),
        Array.from(pipe(Chunk.flatten(chunks), Chunk.drop(n)))
      )
    }))
})
