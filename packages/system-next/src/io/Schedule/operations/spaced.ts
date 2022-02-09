import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import { Schedule } from "../definition"

/**
 * Returns a schedule that recurs continuously, each repetition spaced the
 * specified duration from the last run.
 *
 * @tsplus static ets/ScheduleOps spaced
 */
export function spaced(
  duration: LazyArg<Duration>
): Schedule.WithState<number, unknown, unknown, number> {
  return Schedule.forever.addDelay(duration)
}
