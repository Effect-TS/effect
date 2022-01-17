import { identity } from "../../Function"
import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect"
import { mapEffect_ } from "./mapEffect"

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */

export function flattenEffect<R2, E2, R, E, A>(
  self: Managed<R2, E2, Effect<R, E, A>>,
  __trace?: string
) {
  return mapEffect_(self, identity, __trace)
}
