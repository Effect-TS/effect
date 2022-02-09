import type { Duration } from "../../../data/Duration"
import type { Option } from "../../../data/Option"
import { Schedule } from "../definition"

/**
 * A schedule that recurs during the given duration.
 *
 * @tsplus static ets/ScheduleOps upTo
 */
export function recurUpTo(
  duration: Duration
): Schedule.WithState<Option<number>, unknown, unknown, Duration> {
  return Schedule.elapsed.whileOutput((_) => _ < duration)
}
