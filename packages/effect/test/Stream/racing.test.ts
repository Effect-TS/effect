import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("raceAll sync", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.raceAll(
          Stream.make(0, 1, 2, 3),
          Stream.make(4, 5, 6, 7),
          Stream.make(7, 8, 9, 10)
        ),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      assert.deepStrictEqual(result, [0, 1, 2, 3])
    }))

  it.effect("raceAll async", () =>
    Effect.gen(function*($) {
      const fiber = yield* $(
        Stream.raceAll(
          Stream.fromSchedule(Schedule.spaced("1 second")),
          Stream.fromSchedule(Schedule.spaced("2 second"))
        ),
        Stream.take(5),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray),
        Effect.fork
      )
      yield* TestClock.adjust("5 second")
      const result = yield* Fiber.join(fiber)
      assert.deepStrictEqual(result, [0, 1, 2, 3, 4])
    }))

  it.effect("raceAll combined async + sync", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.raceAll(
          Stream.fromSchedule(Schedule.spaced("1 second")),
          Stream.make(0, 1, 2, 3)
        ),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      assert.deepStrictEqual(result, [0, 1, 2, 3])
    }))

  it.effect("raceAll combined sync + async", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.raceAll(
          Stream.make(0, 1, 2, 3),
          Stream.fromSchedule(Schedule.spaced("1 second"))
        ),
        Stream.runCollect,
        Effect.map(Chunk.toReadonlyArray)
      )
      assert.deepStrictEqual(result, [0, 1, 2, 3])
    }))
})
