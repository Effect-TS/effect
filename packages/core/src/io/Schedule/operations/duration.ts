import { Tuple } from "../../../collection/immutable/Tuple"
import { Duration } from "../../../data/Duration"
import { Effect } from "../../Effect"
import { Decision } from "../Decision"
import type { Schedule } from "../definition"
import { Interval } from "../Interval"
import { makeWithState } from "./_internal/makeWithState"

/**
 * A schedule that can recur one time, the specified amount of time into the
 * future.
 *
 * @tsplus static ets/ScheduleOps duration
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
            Decision.Continue(Interval.after(now + duration.milliseconds))
          )
        : Tuple(false, Duration.Zero, Decision.Done)
    )
  )
}
