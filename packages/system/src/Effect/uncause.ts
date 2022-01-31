// ets_tracing: off

import type { Cause } from "../Cause/cause.js"
import { isEmpty } from "../Cause/cause.js"
import { chain_, halt, unit } from "./core.js"
import type { Effect, RIO } from "./effect.js"

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(
  effect: RIO<R, Cause<E>>,
  __trace?: string
): Effect<R, E, void> {
  return chain_(effect, (a) => (isEmpty(a) ? unit : halt(a)), __trace)
}
