import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Duration from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * A schedule that occurs everywhere, which returns the total elapsed duration
 * since the first step.
 *
 * @tsplus static effect/core/io/Schedule.Ops elapsed
 * @category constructors
 * @since 1.0.0
 */
export const elapsed: Schedule<
  Option.Option<number>,
  never,
  unknown,
  Duration.Duration
> = makeWithState(Option.none as Option.Option<number>, (now, _, state) => {
  switch (state._tag) {
    case "None": {
      return Effect.succeed(
        [
          Option.some(now),
          Duration.zero,
          Decision.continueWith(Interval.after(now))
        ] as const
      )
    }
    case "Some": {
      return Effect.succeed(
        [
          Option.some(state.value),
          Duration.millis(now - state.value),
          Decision.continueWith(Interval.after(now))
        ] as const
      )
    }
  }
})
