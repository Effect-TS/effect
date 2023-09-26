import * as it from "effect-test/utils/extend"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import * as TestClock from "effect/TestClock"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("schedule - runs effect for each recurrence of the schedule", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<Duration.Duration>>([]))
      const effect = pipe(
        Clock.currentTimeMillis,
        Effect.flatMap((duration) => Ref.update(ref, (array) => [...array, Duration.millis(duration)]))
      )
      const schedule = pipe(Schedule.spaced(Duration.seconds(1)), Schedule.intersect(Schedule.recurs(5)))
      yield* $(effect, Effect.schedule(schedule), Effect.fork)
      yield* $(TestClock.adjust(Duration.seconds(5)))
      const value = yield* $(Ref.get(ref))
      const expected = [1, 2, 3, 4, 5].map(Duration.seconds)
      assert.deepStrictEqual(value, expected)
    }))
})
