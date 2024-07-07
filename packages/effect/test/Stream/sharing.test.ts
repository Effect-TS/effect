import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Schedule from "effect/Schedule"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.scoped("share", () =>
    Effect.gen(function*() {
      const sharedStream = yield* Stream.fromSchedule(
        Schedule.spaced("1 seconds")
      ).pipe(Stream.share({}))
      // Adjust 1 second to make sure the stream has started
      yield* TestClock.adjust("1 second")

      const firstFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.runScoped(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )
      yield* TestClock.adjust("1 second")
      const first = yield* Fiber.join(firstFiber)
      assert.deepStrictEqual(first, [1])

      const secondFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.runScoped(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )
      yield* TestClock.adjust("1 second")
      const second = yield* Fiber.join(secondFiber)
      assert.deepStrictEqual(second, [2])
    }))

  it.effect("shareRefCount sequenced", () =>
    Effect.gen(function*() {
      const sharedStream = Stream.fromSchedule(
        Schedule.spaced("1 seconds")
      ).pipe(
        Stream.ensuringWith(() => {
          return Effect.void
        }),
        Stream.shareRefCount({})
      )

      const firstFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const first = yield* Fiber.join(firstFiber)
      assert.deepStrictEqual(first, [0])

      const secondFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.run(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )

      yield* TestClock.adjust("1 second")

      const second = yield* Fiber.join(secondFiber)
      assert.deepStrictEqual(second, [0])
    }))

  it.effect("shareRefCount parallel", () =>
    Effect.gen(function*() {
      const sharedStream = Stream.fromSchedule(
        Schedule.spaced("1 seconds")
      ).pipe(Stream.shareRefCount({}))

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

      assert.deepStrictEqual(result1, [0])
      assert.deepStrictEqual(result2, [0, 1])
    }))
})
