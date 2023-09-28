import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("broadcast - values", () =>
    Effect.gen(function*($) {
      const { result1, result2 } = yield* $(
        Stream.range(0, 4),
        Stream.broadcast(2, 12),
        Effect.flatMap((streams) =>
          Effect.all({
            result1: Stream.runCollect(streams[0]),
            result2: Stream.runCollect(streams[1])
          })
        ),
        Effect.scoped
      )
      const expected = [0, 1, 2, 3, 4]
      assert.deepStrictEqual(Array.from(result1), expected)
      assert.deepStrictEqual(Array.from(result2), expected)
    }))

  it.effect("broadcast - errors", () =>
    Effect.gen(function*($) {
      const { result1, result2 } = yield* $(
        Stream.make(0),
        Stream.concat(Stream.fail("boom")),
        Stream.broadcast(2, 12),
        Effect.flatMap((streams) =>
          Effect.all({
            result1: pipe(streams[0], Stream.runCollect, Effect.either),
            result2: pipe(streams[1], Stream.runCollect, Effect.either)
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(result1, Either.left("boom"))
      assert.deepStrictEqual(result2, Either.left("boom"))
    }))

  it.effect("broadcast - backpressure", () =>
    Effect.gen(function*($) {
      const { result1, result2 } = yield* $(
        Stream.range(0, 4),
        Stream.flatMap(Stream.succeed),
        Stream.broadcast(2, 2),
        Effect.flatMap((streams) =>
          Effect.gen(function*($) {
            const ref = yield* $(Ref.make(Chunk.empty<number>()))
            const latch = yield* $(Deferred.make<never, void>())
            const fiber = yield* $(
              streams[0],
              Stream.tap((n) =>
                pipe(
                  Ref.update(ref, Chunk.append(n)),
                  Effect.zipRight(pipe(
                    Deferred.succeed<never, void>(latch, void 0),
                    Effect.when(() => n === 1)
                  ))
                )
              ),
              Stream.runDrain,
              Effect.fork
            )
            yield* $(Deferred.await(latch))
            const result1 = yield* $(Ref.get(ref))
            yield* $(Stream.runDrain(streams[1]))
            yield* $(Fiber.await(fiber))
            const result2 = yield* $(Ref.get(ref))
            return { result1, result2 }
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(Array.from(result1), [0, 1])
      assert.deepStrictEqual(Array.from(result2), [0, 1, 2, 3, 4])
    }))

  it.effect("broadcast - unsubscribe", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(0, 4),
        Stream.broadcast(2, 2),
        Effect.flatMap((streams) =>
          pipe(
            Stream.toPull(streams[0]),
            Effect.ignore,
            Effect.scoped,
            Effect.zipRight(Stream.runCollect(streams[1]))
          )
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4])
    }))
})
