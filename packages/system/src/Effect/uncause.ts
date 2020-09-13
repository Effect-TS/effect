import type { Cause } from "../Cause/cause"
import { isEmpty } from "../Cause/core"
import { chain_, halt, unit } from "./core"
import type { Effect } from "./effect"

/**
 * When this effect succeeds with a cause, then this method returns a new
 * effect that either fails with the cause that this effect succeeded with,
 * or succeeds with unit, depending on whether the cause is empty.
 *
 * This operation is the opposite of `cause`.
 */
export function uncause<S, R, E, A>(
  effect: Effect<S, R, never, Cause<E>>
): Effect<S, R, E, void> {
  return chain_(effect, (a) => (isEmpty(a) ? unit : halt(a)))
}
