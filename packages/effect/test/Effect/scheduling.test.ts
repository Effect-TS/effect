import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import * as Clock from "effect/Clock"
import * as Cron from "effect/Cron"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
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

  it.effect("schedule - cron does not fail when the test clock is adjusted to infinity", () =>
    Effect.gen(function*() {
      const ref = yield* Ref.make(0)
      const latch = yield* Deferred.make<void>()
      const cron = Cron.unsafeParse("0 0 4 8-14 * *", "UTC")
      const schedule = pipe(Schedule.cron(cron), Schedule.intersect(Schedule.recurs(10)))
      const fiber = yield* pipe(
        Ref.update(ref, (n) => n + 1),
        Effect.zipLeft(Deferred.await(latch)),
        Effect.repeat(schedule),
        Effect.fork
      )

      yield* TestClock.adjust(Infinity)
      yield* Deferred.succeed(latch, void 0)
      yield* Fiber.join(fiber)

      const value = yield* Ref.get(ref)
      assertTrue(value > 0)
    }))
})
