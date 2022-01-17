import type { Supervisor } from "../../Supervisor/definition"
import type { Effect } from "../definition"
import { ISupervise } from "../definition"

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 */
export function supervised_<R, E, A>(
  self: Effect<R, E, A>,
  supervisor: Supervisor<any>,
  __trace?: string
): Effect<R, E, A> {
  return new ISupervise(self, supervisor, __trace)
}

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @ets_data_first supervised_
 */
export function supervised(supervisor: Supervisor<any>, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    supervised_(self, supervisor, __trace)
}
