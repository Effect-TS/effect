import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as TestClock from "effect/TestClock"

describe("Effect", () => {
  it.effect("schedule - runs effect for each recurrence of the schedule", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<ReadonlyArray<Duration.Duration>>([])
      const effect = pipe(
        Clock.currentTimeMillis,
        Effect.flatMap((duration) => Ref.update(ref, (array) => [...array, Duration.millis(duration)]))
      )
      const schedule = pipe(Schedule.spaced(Duration.seconds(1)), Schedule.intersect(Schedule.recurs(5)))
      yield* pipe(effect, Effect.schedule(schedule), Effect.fork)
      yield* TestClock.adjust(Duration.seconds(5))
      const value = yield* Ref.get(ref)
      const expected = [1, 2, 3, 4, 5].map(Duration.seconds)
      deepStrictEqual(value, expected)
    }))

  it.effect("schedule - Schedule.CurrentIterationMetadata", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make<Array<undefined | Schedule.IterationMetadata>>([])
      const effect = Effect.gen(function*() {
        const lastIterationInfo = yield* Schedule.CurrentIterationMetadata

        yield* Ref.update(ref, (array) => [...array, lastIterationInfo])
      })
      const schedule = pipe(Schedule.fibonacci("1 second"), Schedule.intersect(Schedule.recurs(4)))
      yield* pipe(effect, Effect.schedule(schedule), Effect.fork)
      yield* TestClock.adjust(Duration.seconds(50))
      const value = yield* Ref.get(ref)

      deepStrictEqual(value, [
        {
          elapsed: Duration.zero,
          elapsedSincePrevious: Duration.zero,
          recurrence: 1,
          input: undefined,
          output: [Duration.millis(1000), 0],
          now: 0,
          start: 0
        },
        {
          elapsed: Duration.seconds(1),
          elapsedSincePrevious: Duration.seconds(1),
          recurrence: 2,
          input: undefined,
          output: [Duration.millis(1000), 1],
          now: 1000,
          start: 0
        },
        {
          elapsed: Duration.seconds(2),
          elapsedSincePrevious: Duration.seconds(1),
          recurrence: 3,
          input: undefined,
          output: [Duration.millis(2000), 2],
          now: 2000,
          start: 0
        },
        {
          elapsed: Duration.seconds(4),
          elapsedSincePrevious: Duration.seconds(2),
          recurrence: 4,
          input: undefined,
          output: [Duration.millis(3000), 3],
          now: 4000,
          start: 0
        }
      ])
    }))
})
