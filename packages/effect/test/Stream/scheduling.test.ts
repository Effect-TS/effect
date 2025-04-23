import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import { identity, pipe } from "effect/Function"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/TestClock"

describe("Stream", () => {
  it.effect("schedule", () =>
    Effect.gen(function*() {
      const start = yield* Clock.currentTimeMillis
      const fiber = yield* pipe(
        Stream.range(1, 8),
        Stream.schedule(Schedule.fixed(Duration.millis(100))),
        Stream.mapEffect((n) =>
          pipe(
            Clock.currentTimeMillis,
            Effect.map((now) => [n, now - start] as const)
          )
        ),
        Stream.runCollect,
        Effect.fork
      )
      yield* TestClock.adjust(Duration.millis(800))
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(Array.from(result), [
        [1, 100],
        [2, 200],
        [3, 300],
        [4, 400],
        [5, 500],
        [6, 600],
        [7, 700],
        [8, 800]
      ])
    }))

  it.effect("scheduleWith", () =>
    Effect.gen(function*() {
      const schedule = pipe(
        Schedule.recurs(2),
        Schedule.zipRight(Schedule.fromFunction<string, string>(() => "Done"))
      )
      const result = yield* pipe(
        Stream.make("A", "B", "C", "A", "B", "C"),
        Stream.scheduleWith(schedule, { onElement: (s) => s.toLowerCase(), onSchedule: identity }),
        Stream.runCollect
      )
      deepStrictEqual(Array.from(result), ["a", "b", "c", "Done", "a", "b", "c", "Done"])
    }))
})
