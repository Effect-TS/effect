// ets_tracing: off

import { identity } from "../../Function"
import type { Managed } from "../definition"
import { chain_ } from "./chain"

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flatten<R2, E2, R, E, A>(
  self: Managed<R2, E2, Managed<R, E, A>>,
  __trace?: string
) {
  return chain_(self, identity, __trace)
}
