import type { LazyArg } from "../../../data/Function"
import type { Supervisor } from "../../../io/Supervisor/definition"
import { Effect, ISupervise } from "../definition"

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @tsplus fluent ets/Effect supervised
 */
export function supervised_<R, E, A, X>(
  self: Effect<R, E, A>,
  supervisor: LazyArg<Supervisor<X>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(new ISupervise(self, supervisor, __tsplusTrace))
}

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @ets_data_first supervised_
 */
export function supervised<X>(supervisor: LazyArg<Supervisor<X>>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.supervised(supervisor)
}
