import { chunkCoordination } from "effect-test/utils/coordination"
import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe.concurrent("Stream", () => {
  it.effect("interruptWhen - preserves the scope of inner fibers", () =>
    Effect.gen(function*($) {
      const deferred = yield* $(Deferred.make<never, void>())
      const queue1 = yield* $(Queue.unbounded<Chunk.Chunk<number>>())
      const queue2 = yield* $(Queue.unbounded<Chunk.Chunk<number>>())
      yield* $(Queue.offer(queue1, Chunk.of(1)))
      yield* $(Queue.offer(queue2, Chunk.of(2)))
      yield* $(Queue.offer(queue1, Chunk.of(3)), Effect.fork)
      yield* $(Queue.offer(queue2, Chunk.of(4)), Effect.fork)
      const stream1 = Stream.fromChunkQueue(queue1)
      const stream2 = Stream.fromChunkQueue(queue2)
      const stream = pipe(
        stream1,
        Stream.zipLatest(stream2),
        Stream.interruptWhen(Deferred.await(deferred)),
        Stream.take(3)
      )
      const result = yield* $(Stream.runDrain(stream))
      assert.isUndefined(result)
    }))

  it.effect("interruptWhen - interrupts the current element", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      const halt = yield* $(Deferred.make<never, void>())
      const started = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(
        Stream.fromEffect(pipe(
          Deferred.succeed<never, void>(started, void 0),
          Effect.zipRight(Deferred.await(latch)),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )),
        Stream.interruptWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.fork
      )
      yield* $(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed<never, void>(halt, void 0))
      )
      yield* $(Fiber.await(fiber))
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("interruptWhen - propagates errors", () =>
    Effect.gen(function*($) {
      const halt = yield* $(Deferred.make<string, never>())
      yield* $(Deferred.fail(halt, "fail"))
      const result = yield* $(
        Stream.never,
        Stream.interruptWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail"))
    }))

  it.effect("interruptWhenDeferred - interrupts the current element", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(false))
      const latch = yield* $(Deferred.make<never, void>())
      const halt = yield* $(Deferred.make<never, void>())
      const started = yield* $(Deferred.make<never, void>())
      const fiber = yield* $(
        Stream.fromEffect(pipe(
          Deferred.succeed<never, void>(started, void 0),
          Effect.zipRight(Deferred.await(latch)),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )),
        Stream.interruptWhenDeferred(halt),
        Stream.runDrain,
        Effect.fork
      )
      yield* $(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed<never, void>(halt, void 0))
      )
      yield* $(Fiber.await(fiber))
      const result = yield* $(Ref.get(ref))
      assert.isTrue(result)
    }))

  it.effect("interruptWhenDeferred - propagates errors", () =>
    Effect.gen(function*($) {
      const halt = yield* $(Deferred.make<string, never>())
      yield* $(Deferred.fail(halt, "fail"))
      const result = yield* $(
        Stream.never,
        Stream.interruptWhenDeferred(halt),
        Stream.runDrain,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("fail"))
    }))

  it.effect("interruptAfter - halts after the given duration", () =>
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
        Stream.interruptAfter(Duration.seconds(5)),
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
      yield* $(coordination.offer)
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1], [2]]
      )
    }))

  it.effect("interruptAfter - will process first chunk", () =>
    Effect.gen(function*($) {
      const queue = yield* $(Queue.unbounded<number>())
      const fiber = yield* $(
        Stream.fromQueue(queue),
        Stream.interruptAfter(Duration.seconds(5)),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(TestClock.adjust(Duration.seconds(6)))
      yield* $(Queue.offer(queue, 1))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), [])
    }))
})
