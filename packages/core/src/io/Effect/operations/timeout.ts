import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import type { HasClock } from "../../Clock"
import type { Effect } from "../definition"

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @tsplus fluent ets/Effect timeout
 */
export function timeout_<R, E, E1, A>(
  self: Effect<R, E, A>,
  milliseconds: number,
  __tsplusTrace?: string
): Effect<R & HasClock, E, Option<A>> {
  return self.timeoutTo(Option.none, Option.some, milliseconds)
}

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect will
 * be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then instead
 * of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
 * first disconnects the effect's interruption signal before performing the
 * timeout, resulting in earliest possible return, before an underlying effect
 * has been successfully interrupted.
 *
 * @ets_data_first timeout_
 */
export function timeout<E1>(
  cause: LazyArg<E1>,
  milliseconds: number,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasClock, E, Option<A>> =>
    self.timeout(milliseconds)
}
