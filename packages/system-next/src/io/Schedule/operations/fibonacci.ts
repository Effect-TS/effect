import { Tuple } from "../../../collection/immutable/Tuple"
import type { Duration } from "../../../data/Duration"
import { Schedule } from "../definition"

/**
 * A schedule that always recurs, increasing delays by summing the preceding
 * two delays (similar to the fibonacci sequence). Returns the current
 * duration between recurrences.
 *
 * @tsplus static ets/ScheduleOps fibonacci
 */
export function fibonacci(
  one: Duration
): Schedule.WithState<Tuple<[Duration, Duration]>, unknown, unknown, Duration> {
  return Schedule.delayed(
    Schedule.unfold(Tuple(one, one), ({ tuple: [a1, a2] }) => Tuple(a2, a1 + a2)).map(
      (out) => out.get(0)
    )
  )
}
