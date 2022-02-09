import type { Duration } from "../../../data/Duration"
import { Schedule } from "../definition"

/**
 * A schedule that recurs once with the specified delay.
 *
 * @tsplus static ets/ScheduleOps fromDuration
 */
export function fromDuration(
  duration: Duration
): Schedule.WithState<boolean, unknown, unknown, Duration> {
  return Schedule.duration(duration)
}
