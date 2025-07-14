import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constTrue, constVoid, pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as Take from "effect/Take"
import * as TestClock from "effect/TestClock"
import * as TestServices from "effect/TestServices"
import { chunkCoordination } from "../utils/coordination.js"

describe("Stream", () => {
  it.effect("aggregate - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1),
        Stream.aggregate(
          Sink.foldUntil(Chunk.empty<number>(), 3, Chunk.prepend)
        ),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(Chunk.flatten(result)), [1, 1, 1, 1])
      assertTrue(Array.from(result).every((chunk) => chunk.length <= 3))
    }))

  it.effect("aggregate - error propagation #1", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Boom")
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1),
        Stream.aggregate(Sink.die(error)),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("aggregate - error propagation #2", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Boom")
      const result = yield* pipe(
        Stream.make(1, 1),
        Stream.aggregate(
          Sink.foldLeftEffect(Chunk.empty(), () => Effect.die(error))
        ),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("aggregate - interruption propagation #1", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(false))
      const sink = Sink.foldEffect(Chunk.empty<number>(), constTrue, (acc, curr) => {
        if (curr === 1) {
          return Effect.succeed(Chunk.prepend(acc, curr))
        }
        return pipe(
          Deferred.succeed(latch, void 0),
          Effect.zipRight(Effect.never),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )
      })
      const fiber = yield* pipe(
        Stream.make(1, 1, 2),
        Stream.aggregate(sink),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("aggregate - interruption propagation #2", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(false))
      const sink = Sink.fromEffect(pipe(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Ref.set(ref, true))
      ))
      const fiber = yield* pipe(
        Stream.make(1, 1, 2),
        Stream.aggregate(sink),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("aggregate - leftover handling", () =>
    Effect.gen(function*() {
      const input = [1, 2, 2, 3, 2, 3]
      const result = yield* pipe(
        Stream.fromIterable(input),
        Stream.aggregate(Sink.foldWeighted({
          initial: Chunk.empty<number>(),
          maxCost: 4,
          cost: (_, n) => n,
          body: (acc, curr) => Chunk.append(acc, curr)
        })),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(Chunk.flatten(result)), input)
    }))

  it.effect("aggregate - ZIO issue 6395", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.aggregate(Sink.collectAllN(2)),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2], [3]]
      )
    }))

  // Explicitly uses live Clock
  it.effect("issue from zio-kafka", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<Take.Take<number>>())
      const fiber = yield* pipe(
        Stream.fromQueue(queue),
        Stream.flattenTake,
        Stream.aggregate(
          Sink.foldLeft(Chunk.empty<number>(), (acc, n) => Chunk.append(acc, n))
        ),
        Stream.runCollect,
        Effect.fork
      )
      yield* (TestServices.provideLive(Effect.sleep(Duration.seconds(1))))
      yield* (Queue.offer(queue, Take.chunk(Chunk.make(1, 2, 3, 4, 5))))
      yield* (TestServices.provideLive(Effect.sleep(Duration.seconds(1))))
      yield* (Queue.offer(queue, Take.chunk(Chunk.make(6, 7, 8, 9, 10))))
      yield* (TestServices.provideLive(Effect.sleep(Duration.seconds(1))))
      yield* (Queue.offer(queue, Take.chunk(Chunk.make(11, 12, 13, 14, 15))))
      yield* (Queue.offer(queue, Take.end))
      const result = yield* pipe(
        Fiber.join(fiber),
        Effect.map(Chunk.filter(Chunk.isNonEmpty))
      )
      deepStrictEqual(
        Array.from(result).map((chunk) => Array.from(chunk)),
        [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]
      )
    }))

  it.effect("aggregateWithin - child fiber handling", () =>
    Effect.gen(function*() {
      const coordination = yield* (chunkCoordination([
        Chunk.of(1),
        Chunk.of(2),
        Chunk.of(3)
      ]))
      const fiber = yield* pipe(
        Stream.fromQueue(coordination.queue),
        Stream.map(Take.make),
        Stream.tap(() => coordination.proceed),
        Stream.flattenTake,
        Stream.aggregateWithin(
          Sink.last<number>(),
          Schedule.fixed(Duration.millis(200))
        ),
        Stream.interruptWhen(Effect.never),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* pipe(
        coordination.offer,
        Effect.zipRight(TestClock.adjust(Duration.millis(100))),
        Effect.zipRight(coordination.awaitNext),
        Effect.repeatN(3)
      )
      const results = yield* pipe(Fiber.join(fiber), Effect.map(Chunk.compact))
      deepStrictEqual(Array.from(results), [2, 3])
    }))

  it.effect("aggregateWithinEither - simple example", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1, 2, 2),
        Stream.aggregateWithinEither(
          pipe(
            Sink.fold(
              [[] as Array<number>, true] as readonly [Array<number>, boolean],
              (tuple) => tuple[1],
              ([array], curr: number): readonly [Array<number>, boolean] => {
                if (curr === 1) {
                  return [[curr, ...array], true]
                }
                return [[curr, ...array], false]
              }
            ),
            Sink.map((tuple) => tuple[0])
          ),
          Schedule.spaced(Duration.minutes(30))
        ),
        Stream.runCollect
      )
      deepStrictEqual(
        Array.from(result),
        [Either.right([2, 1, 1, 1, 1]), Either.right([2])]
      )
    }))

  it.effect("aggregateWithinEither - fails fast", () =>
    Effect.gen(function*() {
      const queue = yield* (Queue.unbounded<number>())
      yield* pipe(
        Stream.range(1, 9),
        Stream.tap((n) =>
          pipe(
            Effect.fail("Boom"),
            Effect.when(() => n === 6),
            Effect.zipRight(Queue.offer(queue, n))
          )
        ),
        Stream.aggregateWithinEither(
          Sink.foldUntil(void 0, 5, constVoid),
          Schedule.forever
        ),
        Stream.runDrain,
        Effect.catchAll(() => Effect.succeed(void 0))
      )
      const result = yield* (Queue.takeAll(queue))
      yield* (Queue.shutdown(queue))
      deepStrictEqual(Array.from(result), [1, 2, 3, 4, 5])
    }))

  it.effect("aggregateWithinEither - error propagation #1", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Boom")
      const result = yield* pipe(
        Stream.make(1, 1, 1, 1),
        Stream.aggregateWithinEither(
          Sink.die(error),
          Schedule.spaced(Duration.minutes(30))
        ),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("aggregateWithinEither - error propagation #2", () =>
    Effect.gen(function*() {
      const error = new Cause.RuntimeException("Boom")
      const result = yield* pipe(
        Stream.make(1, 1),
        Stream.aggregateWithinEither(
          Sink.foldEffect(Chunk.empty<number>(), constTrue, () => Effect.die(error)),
          Schedule.spaced(Duration.minutes(30))
        ),
        Stream.runCollect,
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))

  it.effect("aggregateWithinEither - interruption propagation #1", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(false))
      const sink = Sink.foldEffect(Chunk.empty<number>(), constTrue, (acc, curr) => {
        if (curr === 1) {
          return Effect.succeed(Chunk.prepend(acc, curr))
        }
        return pipe(
          Deferred.succeed(latch, void 0),
          Effect.zipRight(Effect.never),
          Effect.onInterrupt(() => Ref.set(ref, true))
        )
      })
      const fiber = yield* pipe(
        Stream.make(1, 1, 2),
        Stream.aggregateWithinEither(sink, Schedule.spaced(Duration.minutes(30))),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("aggregateWithinEither - interruption propagation #2", () =>
    Effect.gen(function*() {
      const latch = yield* (Deferred.make<void>())
      const ref = yield* (Ref.make(false))
      const sink = Sink.fromEffect(pipe(
        Deferred.succeed(latch, void 0),
        Effect.zipRight(Effect.never),
        Effect.onInterrupt(() => Ref.set(ref, true))
      ))
      const fiber = yield* pipe(
        Stream.make(1, 1, 2),
        Stream.aggregateWithinEither(sink, Schedule.spaced(Duration.minutes(30))),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(latch))
      yield* (Fiber.interrupt(fiber))
      const result = yield* (Ref.get(ref))
      assertTrue(result)
    }))

  it.effect("aggregateWithinEither - leftover handling", () =>
    Effect.gen(function*() {
      const input = [1, 2, 2, 3, 2, 3]
      const fiber = yield* pipe(
        Stream.fromIterable(input),
        Stream.aggregateWithinEither(
          Sink.foldWeighted({
            initial: Chunk.empty<number>(),
            maxCost: 4,
            cost: (_, n) => n,
            body: (acc, curr) => Chunk.append(acc, curr)
          }),
          Schedule.spaced(Duration.millis(100))
        ),
        Stream.filterMap((either) =>
          Either.isRight(either) ?
            Option.some(either.right) :
            Option.none()
        ),
        Stream.runCollect,
        Effect.map(Chunk.flatten),
        Effect.fork
      )
      yield* (TestClock.adjust(Duration.minutes(31)))
      const result = yield* (Fiber.join(fiber))
      deepStrictEqual(Array.from(result), input)
    }))
})
