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
  it.effect("partitionEither - allows repeated runs without hanging", () =>
    Effect.gen(function*($) {
      const stream = pipe(
        Stream.fromIterable(Chunk.empty<number>()),
        Stream.partitionEither((n) => Effect.succeed(n % 2 === 0 ? Either.left(n) : Either.right(n))),
        Effect.map(([evens, odds]) => pipe(evens, Stream.mergeEither(odds))),
        Effect.flatMap(Stream.runCollect),
        Effect.scoped
      )
      const result = yield* $(
        Effect.all(Array.from({ length: 100 }, () => stream)),
        Effect.as(0)
      )
      assert.strictEqual(result, 0)
    }))

  it.effect("partition - values", () =>
    Effect.gen(function*($) {
      const { result1, result2 } = yield* $(
        Stream.range(0, 5),
        Stream.partition((n) => n % 2 === 0),
        Effect.flatMap(([evens, odds]) =>
          Effect.all({
            result1: Stream.runCollect(evens),
            result2: Stream.runCollect(odds)
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(Array.from(result1), [0, 2, 4])
      assert.deepStrictEqual(Array.from(result2), [1, 3, 5])
    }))

  it.effect("partition - errors", () =>
    Effect.gen(function*($) {
      const { result1, result2 } = yield* $(
        Stream.make(0),
        Stream.concat(Stream.fail("boom")),
        Stream.partition((n) => n % 2 === 0),
        Effect.flatMap(([evens, odds]) =>
          Effect.all({
            result1: Effect.either(Stream.runCollect(evens)),
            result2: Effect.either(Stream.runCollect(odds))
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(result1, Either.left("boom"))
      assert.deepStrictEqual(result2, Either.left("boom"))
    }))

  it.effect("partition - backpressure", () =>
    Effect.gen(function*($) {
      const { result1, result2, result3 } = yield* $(
        Stream.range(0, 5),
        Stream.partition((n) => (n % 2 === 0), { bufferSize: 1 }),
        Effect.flatMap(([evens, odds]) =>
          Effect.gen(function*($) {
            const ref = yield* $(Ref.make(Chunk.empty<number>()))
            const latch = yield* $(Deferred.make<never, void>())
            const fiber = yield* $(
              evens,
              Stream.tap((n) =>
                pipe(
                  Ref.update(ref, Chunk.prepend(n)),
                  Effect.zipRight(
                    pipe(
                      Deferred.succeed<never, void>(latch, void 0),
                      Effect.when(() => n === 2)
                    )
                  )
                )
              ),
              Stream.runDrain,
              Effect.fork
            )
            yield* $(Deferred.await(latch))
            const result1 = yield* $(Ref.get(ref))
            const result2 = yield* $(Stream.runCollect(odds))
            yield* $(Fiber.await(fiber))
            const result3 = yield* $(Ref.get(ref))
            return { result1, result2, result3 }
          })
        ),
        Effect.scoped
      )
      assert.deepStrictEqual(Array.from(result1), [2, 0])
      assert.deepStrictEqual(Array.from(result2), [1, 3, 5])
      assert.deepStrictEqual(Array.from(result3), [4, 2, 0])
    }))
})
