import { describe, it } from "@effect/vitest"
import { assertFalse, assertLeft, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"
import { chunkCoordination } from "../utils/coordination.js"

describe("Stream", () => {
  it.effect("haltWhen - halts after the current element", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      yield* pipe(
        Deferred.await(latch),
        Effect.onInterrupt(() => Ref.set(ref, true)),
        Stream.fromEffect,
        Stream.haltWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.fork
      )
      yield* (Deferred.succeed(halt, void 0))
      yield* (Deferred.succeed(latch, void 0))
      const result = yield* (Ref.get(ref))
      assertFalse(result)
    }))

  it.effect("haltWhen - propagates errors", () =>
    Effect.gen(function*() {
      const halt = yield* (Deferred.make<void, string>())
      yield* (Deferred.fail(halt, "fail"))
      const result = yield* pipe(
        Stream.make(0),
        Stream.forever,
        Stream.haltWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "fail")
    }))

  it.effect("haltWhenDeferred - halts after the current element", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      yield* pipe(
        Deferred.await(latch),
        Effect.onInterrupt(() => Ref.set(ref, true)),
        Stream.fromEffect,
        Stream.haltWhenDeferred(halt),
        Stream.runDrain,
        Effect.fork
      )
      yield* (Deferred.succeed(halt, void 0))
      yield* (Deferred.succeed(latch, void 0))
      const result = yield* (Ref.get(ref))
      assertFalse(result)
    }))

  it.effect("haltWhenDeferred - propagates errors", () =>
    Effect.gen(function*() {
      const halt = yield* (Deferred.make<void, string>())
      yield* (Deferred.fail(halt, "fail"))
      const result = yield* pipe(
        Stream.make(1),
        Stream.haltWhenDeferred(halt),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "fail")
    }))

  it.effect("haltAfter - halts after the given duration", () =>
    Effect.gen(function*() {
      const coordination = yield* (chunkCoordination([
        Chunk.of(1),
        Chunk.of(2),
        Chunk.of(3),
        Chunk.of(4)
      ]))
      const fiber = yield* pipe(
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
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.seconds(3))),
        Effect.zipRight(coordination.awaitNext)
      )
      yield* (coordination.offer)
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1], [2], [3]]
      )
    }))

  it.effect("haltAfter - will process first chunk", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<number>())
      const fiber = yield* pipe(
        Stream.fromQueue(queue),
        Stream.haltAfter(Duration.seconds(5)),
        Stream.runCollect,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.seconds(6)))
      yield* (Queue.offer(queue, 1))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [1])
    }))
})
