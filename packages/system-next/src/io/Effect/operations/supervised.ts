import type { Supervisor } from "../../../io/Supervisor/definition"
import type { Effect } from "../definition"
import { ISupervise } from "../definition"

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @ets fluent ets/Effect supervised
 */
export function supervised_<R, E, A>(
  self: Effect<R, E, A>,
  supervisor: Supervisor<any>,
  __etsTrace?: string
): Effect<R, E, A> {
  return new ISupervise(self, supervisor, __etsTrace)
}

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @ets_data_first supervised_
 */
export function supervised(supervisor: Supervisor<any>, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    supervised_(self, supervisor)
}
