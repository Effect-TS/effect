import { chunkCoordination } from "effect-test/utils/coordination"
import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("haltWhen - halts after the current element", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      const halt = yield* $(Deferred.make<never, void>())
      yield* $(
        Deferred.await(latch),
        Effect.onInterrupt(() => Ref.set(ref, true)),
        Stream.fromEffect,
        Stream.haltWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.fork
      )
      yield* $(Deferred.succeed<never, void>(halt, void 0))
      yield* $(Deferred.succeed<never, void>(latch, void 0))
      const result = yield* $(Ref.get(ref))
      assert.isFalse(result)
    }))

  it.effect("haltWhen - propagates errors", () =>
    Effect.gen(function*($) {
      const halt = yield* $(Deferred.make<string, void>())
      yield* $(Deferred.fail(halt, "fail"))
      const result = yield* $(
        Stream.make(0),
        Stream.forever,
        Stream.haltWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail"))
    }))

  it.effect("haltWhenDeferred - halts after the current element", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      const halt = yield* $(Deferred.make<never, void>())
      yield* $(
        Deferred.await(latch),
        Effect.onInterrupt(() => Ref.set(ref, true)),
        Stream.fromEffect,
        Stream.haltWhenDeferred(halt),
        Stream.runDrain,
        Effect.fork
      )
      yield* $(Deferred.succeed<never, void>(halt, void 0))
      yield* $(Deferred.succeed<never, void>(latch, void 0))
      const result = yield* $(Ref.get(ref))
      assert.isFalse(result)
    }))

  it.effect("haltWhenDeferred - propagates errors", () =>
    Effect.gen(function*($) {
      const halt = yield* $(Deferred.make<string, void>())
      yield* $(Deferred.fail(halt, "fail"))
      const result = yield* $(
        Stream.make(1),
        Stream.haltWhenDeferred(halt),
        Stream.runDrain,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail"))
    }))

  it.effect("haltAfter - halts after the given duration", () =>
    Effect.gen(function*($) {
      const coordination = yield* $(chunkCoordination([
        Chunk.of(1),
        Chunk.of(2),
        Chunk.of(3),
        Chunk.of(4)
      ]))
      const fiber = yield* $(
        Stream.fromQueue(coordination.queue),
        Stream.filterMapWhile(Exit.match({
          onFailure: Option.none,
          onSuccess: Option.some
        })),
        Stream.haltAfter(Duration.seconds(5)),
        Stream.tap(() => coordination.proceed),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* $(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* $(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* $(coordination.offer)
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1], [2], [3]]
      )
    }))

  it.effect("haltAfter - will process first chunk", () =>
    Effect.gen(function*($) {
      const queue = yield* $(Queue.unbounded<number>())
      const fiber = yield* $(
        Stream.fromQueue(queue),
        Stream.haltAfter(Duration.seconds(5)),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(TestClock.adjust(Duration.seconds(6)))
      yield* $(Queue.offer(queue, 1))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), [1])
    }))
})
