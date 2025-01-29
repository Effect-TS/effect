import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { deepStrictEqual } from "effect/test/util"
import { chunkCoordination } from "effect/test/utils/coordination"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { describe } from "vitest"

describe("Stream", () => {
  it.effect("timeout - succeed", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.succeed(1),
        Stream.timeout(Duration.infinity),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("timeout - should end the stream", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeout(Duration.zero),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("timeoutFail - succeed", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeoutFail(() => false, Duration.zero),
        Stream.runDrain,
        Effect.map(() => true),
        Effect.either
      )
      deepStrictEqual(result, Either.left(false))
    }))

  it.effect("timeoutFail - failures", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.fail("original"),
        Stream.timeoutFail(() => "timeout", Duration.minutes(15)),
        Stream.runDrain,
        Effect.flip
      )
      deepStrictEqual(result, "original")
    }))

  it.effect("timeoutFailCause", () =>
    Effect.gen(function*($) {
      const error = new Cause.RuntimeException("boom")
      const result = yield* $(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeoutFailCause(() => Cause.die(error), Duration.zero),
        Stream.runDrain,
        Effect.sandbox,
        Effect.either
      )
      deepStrictEqual(result, Either.left(Cause.die(error)))
    }))

  it.effect("timeoutTo - succeed", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.range(0, 4),
        Stream.timeoutTo(Duration.infinity, Stream.succeed(-1)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4])
    }))

  it.effect("timeoutTo - should switch streams", () =>
    Effect.gen(function*($) {
      const coordination = yield* $(chunkCoordination([
        Chunk.of(1),
        Chunk.of(2),
        Chunk.of(3)
      ]))
      const fiber = yield* $(
        Stream.fromQueue(coordination.queue),
        Stream.filterMapWhile(Exit.match({ onSuccess: Option.some, onFailure: Option.none })),
        Stream.flattenChunks,
        Stream.timeoutTo(Duration.seconds(2), Stream.succeed(4)),
        Stream.tap(() => coordination.proceed),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(1))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* $(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* $(coordination.offer)
      const result = yield* $(Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [1, 2, 4])
    }))

  it.effect("timeoutTo - should not apply timeout after switch", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(Queue.unbounded<number>())
      const queue2 = yield* $(Queue.unbounded<number>())
      const stream1 = Stream.fromQueue(queue1)
      const stream2 = Stream.fromQueue(queue2)
      const fiber = yield* $(
        stream1,
        Stream.timeoutTo(Duration.seconds(2), stream2),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(
        Queue.offer(queue1, 1),
        Effect.zipRight(TestClock.adjust(Duration.seconds(1)))
      )
      yield* $(
        Queue.offer(queue1, 2),
        Effect.zipRight(TestClock.adjust(Duration.seconds(3)))
      )
      yield* $(Queue.offer(queue1, 3))
      yield* $(
        Queue.offer(queue2, 4),
        Effect.zipRight(TestClock.adjust(Duration.seconds(3)))
      )
      yield* $(
        Queue.offer(queue2, 5),
        Effect.zipRight(Queue.shutdown(queue2))
      )
      const result = yield* $(Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [1, 2, 4, 5])
    }))
})
