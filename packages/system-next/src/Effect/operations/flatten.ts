// ets_tracing: off

import { identity } from "../../Function"
import type { Effect } from "../definition"
import { chain_ } from "./chain"

/**
 * Returns an effect that performs the outer effect first, followed by the
 * inner effect, yielding the value of the inner effect.
 *
 * This method can be used to "flatten" nested effects.
 */
export function flatten<R, E, R1, E1, A>(
  self: Effect<R, E, Effect<R1, E1, A>>,
  __trace?: string
): Effect<R & R1, E | E1, A> {
  return chain_(self, identity)
}
