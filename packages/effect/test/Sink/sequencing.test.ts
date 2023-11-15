import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Sink", () => {
  it.effect("flatMap - empty input", () =>
    Effect.gen(function*($) {
      const sink = pipe(Sink.head<number>(), Sink.flatMap(Sink.succeed))
      const result = yield* $(Stream.empty, Stream.run(sink))
      assert.deepStrictEqual(result, Option.none())
    }))

  it.effect("flatMap - non-empty input", () =>
    Effect.gen(function*($) {
      const sink = pipe(Sink.head<number>(), Sink.flatMap(Sink.succeed))
      const result = yield* $(Stream.make(1, 2, 3), Stream.run(sink))
      assert.deepStrictEqual(result, Option.some(1))
    }))

  it.effect("flatMap - with leftovers", () =>
    Effect.gen(function*($) {
      const chunks = Chunk.make(
        Chunk.make(1, 2),
        Chunk.make(3, 4, 5),
        Chunk.empty<number>(),
        Chunk.make(7, 8, 9, 10)
      )
      const sink = pipe(
        Sink.head<number>(),
        Sink.flatMap((head) =>
          pipe(
            Sink.count,
            Sink.map((count) => [head, count] as const)
          )
        )
      )
      const [option, count] = yield* $(Stream.fromChunks(...chunks), Stream.run(sink))
      assert.deepStrictEqual(option, Chunk.head(Chunk.flatten(chunks)))
      assert.strictEqual(
        count + Option.match(option, {
          onNone: () => 0,
          onSome: () => 1
        }),
        pipe(chunks, Chunk.map(Chunk.size), Chunk.reduce(0, (a, b) => a + b))
      )
    }))
})
