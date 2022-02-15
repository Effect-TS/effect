import type { RIO } from "../../Effect"
import { Schedule } from "../definition"

/**
 * A schedule that recurs for until the predicate evaluates to true.
 *
 * @tsplus static ets/ScheduleOps recurUntilEffect
 */
export function recurUntilEffect<Env, A>(
  f: (a: A) => RIO<Env, boolean>
): Schedule.WithState<void, Env, A, A> {
  return Schedule.identity<A>().untilInputEffect(f)
}
