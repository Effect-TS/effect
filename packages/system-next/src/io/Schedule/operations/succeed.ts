import type { LazyArg } from "../../../data/Function"
import { Schedule } from "../definition"

/**
 * Returns a schedule that repeats one time, producing the specified constant
 * value.
 *
 * @tsplus static ets/ScheduleOps succeed
 */
export function succeed<A>(
  a: LazyArg<A>
): Schedule.WithState<number, unknown, unknown, A> {
  return Schedule.forever.map(a)
}
