import { Decision } from "@effect-ts/core/io/Schedule/Decision";
import { Interval } from "@effect-ts/core/io/Schedule/Interval";
import { makeWithState } from "@effect-ts/core/io/Schedule/operations/_internal/makeWithState";

/**
 * A schedule that can recur one time, the specified amount of time into the
 * future.
 *
 * @tsplus static ets/Schedule/Ops duration
 */
export function duration(
  duration: Duration
): Schedule.WithState<boolean, unknown, unknown, Duration> {
  return makeWithState(true as boolean, (now, _, state) =>
    Effect.succeed(
      state
        ? Tuple(
          false,
          duration,
          Decision.Continue(Interval.after(now + duration.millis))
        )
        : Tuple(false, (0).millis, Decision.Done)
    ));
}
