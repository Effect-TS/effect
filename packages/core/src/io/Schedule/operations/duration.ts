import { Decision } from "@effect/core/io/Schedule/Decision"
import { Interval } from "@effect/core/io/Schedule/Interval"
import { makeWithState } from "@effect/core/io/Schedule/operations/_internal/makeWithState"
import * as Duration from "@fp-ts/data/Duration"

/**
 * A schedule that can recur one time, the specified amount of time into the
 * future.
 *
 * @tsplus static effect/core/io/Schedule.Ops duration
 * @category constructors
 * @since 1.0.0
 */
export function duration(
  duration: Duration.Duration
): Schedule<boolean, never, unknown, Duration.Duration> {
  return makeWithState(true as boolean, (now, _, state) =>
    Effect.succeed(
      state
        ? [false, duration, Decision.continueWith(Interval.after(now + duration.millis))] as const
        : [false, Duration.zero, Decision.Done] as const
    ))
}
