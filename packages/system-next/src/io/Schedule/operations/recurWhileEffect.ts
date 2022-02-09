import type { RIO } from "../../Effect"
import { Schedule } from "../definition"

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to
 * true.
 *
 * @tsplus static ets/ScheduleOps recurWhileEffect
 */
export function recurWhileEffect<Env, A>(
  f: (a: A) => RIO<Env, boolean>
): Schedule.WithState<void, Env, A, A> {
  return Schedule.identity<A>().whileInputEffect(f)
}
