import { identity } from "../../../data/Function"
import type { Effect } from "../definition"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @tsplus fluent ets/Effect absorb
 */
export function absorb<R, E, A>(self: Effect<R, E, A>, __etsTrace?: string) {
  return self.absorbWith(identity)
}
