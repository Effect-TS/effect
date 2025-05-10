import { describe, it } from "@effect/vitest"
import { assertLeft, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Schedule } from "effect"
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
  it.effect("interruptWhen - preserves the scope of inner fibers", () =>
    Effect.gen(function*() {
      const deferred = yield* (Deferred.make<void>())
      const queue1 = yield* (Queue.unbounded<Chunk.Chunk<number>>())
      const queue2 = yield* (Queue.unbounded<Chunk.Chunk<number>>())
      yield* (Queue.offer(queue1, Chunk.of(1)))
      yield* (Queue.offer(queue2, Chunk.of(2)))
      yield* pipe(Queue.offer(queue1, Chunk.of(3)), Effect.fork)
      yield* pipe(Queue.offer(queue2, Chunk.of(4)), Effect.fork)
      const stream1 = Stream.fromChunkQueue(queue1)
      const stream2 = Stream.fromChunkQueue(queue2)
      const stream = pipe(
        stream1,
        Stream.zipLatest(stream2),
        Stream.interruptWhen(Deferred.await(deferred)),
        Stream.take(3)
      )
      const result = yield* (Stream.runDrain(stream))
      strictEqual(result, undefined)
    }))

  it.effect("interruptWhen - interrupts the current element", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      const started = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Stream.fromEffect(pipe(
          Deferred.succeed(started, void 0),
          Effect.zipRight(Deferred.await(latch)),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )),
        Stream.interruptWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.fork
      )
      yield* pipe(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed(halt, void 0))
      )
      yield* (Fiber.await(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("interruptWhen - propagates errors", () =>
    Effect.gen(function*() {
      const halt = yield* (Deferred.make<never, string>())
      yield* (Deferred.fail(halt, "fail"))
      const result = yield* pipe(
        Stream.never,
        Stream.interruptWhen(Deferred.await(halt)),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "fail")
    }))

  it.effect("interruptWhenDeferred - interrupts the current element", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make(false))
      const latch = yield* (Deferred.make<void>())
      const halt = yield* (Deferred.make<void>())
      const started = yield* (Deferred.make<void>())
      const fiber = yield* pipe(
        Stream.fromEffect(pipe(
          Deferred.succeed(started, void 0),
          Effect.zipRight(Deferred.await(latch)),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )),
        Stream.interruptWhenDeferred(halt),
        Stream.runDrain,
        Effect.fork
      )
      yield* pipe(
        Deferred.await(started),
        Effect.zipRight(Deferred.succeed(halt, void 0))
      )
      yield* (Fiber.await(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("interruptWhenDeferred - propagates errors", () =>
    Effect.gen(function*() {
      const halt = yield* (Deferred.make<never, string>())
      yield* (Deferred.fail(halt, "fail"))
      const result = yield* pipe(
        Stream.never,
        Stream.interruptWhenDeferred(halt),
        Stream.runDrain,
        Effect.either
      )
      assertLeft(result, "fail")
    }))

  it.effect("interruptAfter - halts after the given duration", () =>
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
        Stream.interruptAfter(Duration.seconds(5)),
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
      yield* (coordination.offer)
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1], [2]]
      )
    }))

  it.effect("interruptAfter - will process first chunk", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<number>())
      const fiber = yield* pipe(
        Stream.fromQueue(queue),
        Stream.interruptAfter(Duration.seconds(5)),
        Stream.runCollect,
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.seconds(6)))
      yield* (Queue.offer(queue, 1))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), [])
    }))

  it.effect("interruptWhen - interrupts the effect", () =>
    Effect.gen(function*() {
      let interrupted = false
      const effect = Effect.never.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true
          })
        )
      )

      const fiber = yield* Stream.fromSchedule(Schedule.spaced("1 second")).pipe(
        Stream.interruptWhen(effect),
        Stream.take(1),
        Stream.runDrain,
        Effect.fork
      )
      yield* TestClock.adjust("1 seconds")
      yield* fiber.await

      assertTrue(interrupted)
    }))

  it.effect("forked children are not interrupted early by interruptWhen", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<string>()
      const ref = yield* Ref.make(0)
      yield* Stream.fromQueue(queue).pipe(
        Stream.runForEach(() => Ref.update(ref, (n) => n + 1)),
        Effect.fork,
        Effect.as(Stream.concat(Stream.succeed(""), Stream.never)),
        Stream.unwrapScoped,
        Stream.interruptWhen(Effect.never),
        Stream.runDrain,
        Effect.fork
      )
      yield* Queue.offer(queue, "message").pipe(
        Effect.forever,
        Effect.fork
      )
      const result = yield* Ref.get(ref).pipe(
        Effect.repeat({ until: (n) => n >= 10 })
      )
      strictEqual(result, 10)
    }))
})
