// ets_tracing: off

import type * as CL from "../Clock/index.js"
import * as O from "../Option/index.js"
import type { Effect } from "./effect.js"
import { timeoutTo_ } from "./timeoutTo.js"

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 *
 * @ets_data_first timeout_
 */
export function timeout(d: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => timeout_(self, d, __trace)
}

/**
 * Returns an effect that will timeout this effect, returning `None` if the
 * timeout elapses before the effect has produced a value; and returning
 * `Some` of the produced value otherwise.
 *
 * If the timeout elapses without producing a value, the running effect
 * will be safely interrupted.
 *
 * WARNING: The effect returned by this method will not itself return until
 * the underlying effect is actually interrupted. This leads to more
 * predictable resource utilization. If early return is desired, then
 * instead of using `timeout(d)(effect)`, use `disconnect(timeout(d)(effect))`,
 * which first disconnects the effect's interruption signal before performing
 * the timeout, resulting in earliest possible return, before an underlying
 * effect has been successfully interrupted.
 */
export function timeout_<R, E, A>(
  self: Effect<R, E, A>,
  d: number,
  __trace?: string
): Effect<R & CL.HasClock, E, O.Option<A>> {
  return timeoutTo_(self, d, O.none, O.some, __trace)
}
