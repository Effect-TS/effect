import { identity } from "../../../data/Function"
import type { Managed } from "../definition"
import { orDieWith_ } from "./orDieWith"

/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 */
export function orDie<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, A> {
  return orDieWith_(self, identity, __trace)
}
