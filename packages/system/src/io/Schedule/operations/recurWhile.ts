import type { Predicate } from "../../../data/Function"
import { Schedule } from "../definition"

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 *
 * @tsplus static ets/ScheduleOps recurWhile
 */
export function recurWhile<A>(
  f: Predicate<A>
): Schedule.WithState<void, unknown, A, A> {
  return Schedule.identity<A>().whileInput(f)
}
