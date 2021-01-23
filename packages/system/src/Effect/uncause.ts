import type { Cause } from "../Cause/cause"
import { isEmpty } from "../Cause/core"
import { chain_, halt, unit } from "./core"
import type { Effect, RIO } from "./effect"

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<R, E>(effect: RIO<R, Cause<E>>): Effect<R, E, void> {
  return chain_(effect, (a) => (isEmpty(a) ? unit : halt(a)))
}
