import { describe, it } from "@effect/vitest"
import { assertLeft, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import { chunkCoordination } from "../utils/coordination.js"

describe("Stream", () => {
  it.effect("timeout - succeed", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.succeed(1),
        Stream.timeout(Duration.infinity),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("timeout - should end the stream", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeout(Duration.zero),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("timeoutFail - succeed", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeoutFail(() => false, Duration.zero),
        Stream.runDrain,
        Effect.map(() => true),
        Effect.either
      )
      assertLeft(result, false)
    }))

  it.effect("timeoutFail - failures", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.fail("original"),
        Stream.timeoutFail(() => "timeout", Duration.minutes(15)),
        Stream.runDrain,
        Effect.flip
      )
      deepStrictEqual(result, "original")
    }))

  it.effect("timeoutFailCause", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("boom")
      const result = yield* pipe(
        Stream.range(0, 4),
        Stream.tap(() => Effect.sleep(Duration.infinity)),
        Stream.timeoutFailCause(() => Cause.die(error), Duration.zero),
        Stream.runDrain,
        Effect.sandbox,
        Effect.either
      )
      assertLeft(result, Cause.die(error))
    }))

  it.effect("timeoutTo - succeed", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.range(0, 4),
        Stream.timeoutTo(Duration.infinity, Stream.succeed(-1)),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4])
    }))

  it.effect("timeoutTo - should switch streams", () =>
    Effect.gen(function*() {
      const coordination = yield* chunkCoordination([
        Chunk.of(1),
        Chunk.of(2),
        Chunk.of(3)
      ])
      const fiber = yield* pipe(
        Stream.fromQueue(coordination.queue),
        Stream.filterMapWhile(Exit.match({ onSuccess: Option.some, onFailure: Option.none })),
        Stream.flattenChunks,
        Stream.timeoutTo(Duration.seconds(2), Stream.succeed(4)),
        Stream.tap(() => coordination.proceed),
        Stream.runCollect,
        Effect.fork
      )
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(1))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* coordination.offer
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(Array.from(result), [1, 2, 4])
    }))

  it.effect("timeoutTo - should not apply timeout after switch", () =>
    Effect.gen(function*() {
      const queue1 = yield* Queue.unbounded<number>()
      const queue2 = yield* Queue.unbounded<number>()
      const stream1 = Stream.fromQueue(queue1)
      const stream2 = Stream.fromQueue(queue2)
      const fiber = yield* pipe(
        stream1,
        Stream.timeoutTo(Duration.seconds(2), stream2),
        Stream.runCollect,
        Effect.fork
      )
      yield* pipe(
        Queue.offer(queue1, 1),
        Effect.zipRight(TestClock.adjust(Duration.seconds(1)))
      )
      yield* pipe(
        Queue.offer(queue1, 2),
        Effect.zipRight(TestClock.adjust(Duration.seconds(3)))
      )
      yield* Queue.offer(queue1, 3)
      yield* pipe(
        Queue.offer(queue2, 4),
        Effect.zipRight(TestClock.adjust(Duration.seconds(3)))
      )
      yield* pipe(
        Queue.offer(queue2, 5),
        Effect.zipRight(Queue.shutdown(queue2))
      )
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(Array.from(result), [1, 2, 4, 5])
    }))
})
