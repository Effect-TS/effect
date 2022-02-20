import type { Duration } from "../../../data/Duration"
import { Schedule } from "../definition"

/**
 * A schedule that always recurs, but will wait a certain amount between
 * repetitions, given by `base * factor.pow(n)`, where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 *
 * @tsplus static ets/ScheduleOps exponential
 */
export function exponential(
  base: Duration,
  factor = 2.0
): Schedule.WithState<number, unknown, unknown, Duration> {
  return Schedule.delayed(Schedule.forever.map((i) => base * Math.pow(factor, i)))
}
