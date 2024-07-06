import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as PubSub from "effect/PubSub"
import * as Schedule from "effect/Schedule"
import * as Sink from "effect/Sink"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.scoped("share - values", () =>
    Effect.gen(function*($) {
      const source = [0, 1, 2, 3, 4]
      const sharedStream = Stream.fromIterable(source).pipe(
        Stream.share({ connector: PubSub.unbounded() })
      )

      const [result1, result2] = yield* $(
        Effect.all([
          Stream.runCollect(sharedStream),
          Stream.runCollect(sharedStream)
        ])
      )
      assert.deepStrictEqual(Array.from(result1), source)
      assert.deepStrictEqual(Array.from(result2), source)
    }))

  it.scoped("share - resetOnRefCountZero: false", () =>
    Effect.gen(function*() {
      const sharedStream = Stream.fromSchedule(
        Schedule.spaced("1 seconds")
      ).pipe(
        Stream.share({
          connector: PubSub.unbounded(),
          resetOnRefCountZero: false
        })
      )

      const firstFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.runScoped(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )
      yield* TestClock.adjust("1 second")
      const first = yield* Fiber.join(firstFiber)
      assert.deepStrictEqual(first, [0])

      const secondFiber = yield* sharedStream.pipe(
        Stream.take(1),
        Stream.runScoped(Sink.collectAll()),
        Effect.map(Array.from),
        Effect.fork
      )
      yield* TestClock.adjust("1 second")
      const second = yield* Fiber.join(secondFiber)
      assert.deepStrictEqual(second, [1])
    }))
})
