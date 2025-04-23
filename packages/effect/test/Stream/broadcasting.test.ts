import { describe, it } from "@effect/vitest"
import { assertLeft, deepStrictEqual } from "@effect/vitest/utils"
import * as Chunk from "effect/Chunk"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"

describe("Stream", () => {
  it.effect("broadcast - values", () =>
    Effect.gen(function*() {
      const { result1, result2 } = yield* pipe(
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
      deepStrictEqual(Array.from(result1), expected)
      deepStrictEqual(Array.from(result2), expected)
    }))

  it.effect("broadcast - errors", () =>
    Effect.gen(function*() {
      const { result1, result2 } = yield* pipe(
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
      assertLeft(result1, "boom")
      assertLeft(result2, "boom")
    }))

  it.effect("broadcast - backpressure", () =>
    Effect.gen(function*() {
      const { result1, result2 } = yield* pipe(
        Stream.range(0, 4),
        Stream.flatMap(Stream.succeed),
        Stream.broadcast(2, 2),
        Effect.flatMap((streams) =>
          Effect.gen(function*() {
            const ref = yield* (Ref.make(Chunk.empty<number>()))
            const latch = yield* (Deferred.make<void>())
            const fiber = yield* pipe(
              streams[0],
              Stream.tap((n) =>
                pipe(
                  Ref.update(ref, Chunk.append(n)),
                  Effect.zipRight(pipe(
                    Deferred.succeed(latch, void 0),
                    Effect.when(() => n === 1)
                  ))
                )
              ),
              Stream.runDrain,
              Effect.fork
            )
            yield* (Deferred.await(latch))
            const result1 = yield* (Ref.get(ref))
            yield* (Stream.runDrain(streams[1]))
            yield* (Fiber.await(fiber))
            const result2 = yield* (Ref.get(ref))
            return { result1, result2 }
          })
        ),
        Effect.scoped
      )
      deepStrictEqual(Array.from(result1), [0, 1])
      deepStrictEqual(Array.from(result2), [0, 1, 2, 3, 4])
    }))

  it.effect("broadcast - unsubscribe", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
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
      deepStrictEqual(Array.from(result), [0, 1, 2, 3, 4])
    }))

  it.scoped("share sequenced", () =>
    Effect.gen(function*() {
      const sharedStream = yield* Stream.fromSchedule(Schedule.spaced("1 seconds")).pipe(
        Stream.share({ capacity: 16 })
      )

      const firstFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const first = yield* Fiber.join(firstFiber)
      deepStrictEqual(first, [0])

      const secondFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const second = yield* Fiber.join(secondFiber)
      deepStrictEqual(second, [0])
    }))

  it.scoped("share sequenced with idleTimeToLive", () =>
    Effect.gen(function*() {
      const sharedStream = yield* Stream.fromSchedule(Schedule.spaced("1 seconds")).pipe(
        Stream.share({
          capacity: 16,
          idleTimeToLive: "1 second"
        })
      )

      const firstFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const first = yield* Fiber.join(firstFiber)
      deepStrictEqual(first, [0])

      const secondFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const second = yield* Fiber.join(secondFiber)
      deepStrictEqual(second, [1])
    }))

  it.scoped("share parallel", () =>
    Effect.gen(function*() {
      const sharedStream = yield* Stream.fromSchedule(Schedule.spaced("1 seconds")).pipe(
        Stream.share({ capacity: 16 })
      )

      const fiber1 = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map((x) => Array.from(x)),
        Effect.fork
      )
      const fiber2 = yield* sharedStream.pipe(
        Stream.take(2),
        Stream.run(Sink.collectAll()),
        Effect.map((x) => Array.from(x)),
        Effect.fork
      )

      yield* TestClock.adjust("2 second")
      const [result1, result2] = yield* Fiber.joinAll([fiber1, fiber2])

      deepStrictEqual(result1, [0])
      deepStrictEqual(result2, [0, 1])
    }))
})
