import { identity } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 *
 * @tsplus fluent ets/Managed flattenEffect
 */
export function flattenEffect<R2, E2, R, E, A>(
  self: Managed<R2, E2, Effect<R, E, A>>,
  __etsTrace?: string
) {
  return self.mapEffect(identity)
}
