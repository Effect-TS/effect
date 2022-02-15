import type { Equal } from "../../../prelude/Equal"
import { Schedule } from "../definition"

/**
 * A schedule that recurs for as long as the predicate is equal to the
 * specified value.
 *
 * @tsplus static ets/ScheduleOps recurWhileEquals
 */
export function recurWhileEquals<A>(equal: Equal<A>) {
  return (a: A): Schedule.WithState<void, unknown, A, A> =>
    Schedule.identity<A>().whileInput((_) => equal.equals(_, a))
}
