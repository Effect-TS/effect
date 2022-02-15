import { identity } from "../../../data/Function"
import { some } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Unearth the unchecked failure of the effect (opposite of `orDie`).
 *
 * @tsplus fluent ets/Effect resurrect
 */
export function resurrect<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, unknown, A> {
  return self.unrefineWith(some, identity)
}
