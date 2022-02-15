import type { Equal } from "../../../prelude/Equal"
import { Schedule } from "../definition"

/**
 * A schedule that recurs for until the predicate is equal.
 *
 * @tsplus static ets/ScheduleOps recurUntilEquals
 */
export function recurUntilEquals<A>(equal: Equal<A>) {
  return (a: A): Schedule.WithState<void, unknown, A, A> =>
    Schedule.identity<A>().untilInput((_) => equal.equals(_, a))
}
