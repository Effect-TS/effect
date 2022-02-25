import { identity } from "../../../data/Function"
import type { Managed } from "../definition"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @tsplus fluent ets/Managed orDie
 */
export function orDie<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, never, A> {
  return self.orDieWith(identity)
}
