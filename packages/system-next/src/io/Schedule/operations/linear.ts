import type { Duration } from "../../../data/Duration"
import { Schedule } from "../definition"

/**
 * A schedule that always recurs, but will repeat on a linear time interval,
 * given by `base * n` where `n` is the number of repetitions so far. Returns
 * the current duration between recurrences.
 *
 * @tsplus static ets/ScheduleOps linear
 */
export function linear(
  base: Duration
): Schedule.WithState<number, unknown, unknown, Duration> {
  return Schedule.delayed(Schedule.forever.map((i) => base * (i + 1)))
}
