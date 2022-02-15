import { Schedule } from "../definition"

/**
 * A schedule that always recurs, mapping input values through the specified
 * function.
 *
 * @tsplus static ets/ScheduleOps fromFunction
 */
export function fromFunction<A, B>(
  f: (a: A) => B
): Schedule.WithState<void, unknown, A, B> {
  return Schedule.identity<A>().map(f)
}
