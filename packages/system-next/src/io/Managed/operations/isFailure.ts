import { constFalse, constTrue } from "../../../data/Function"
import type { Managed } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns whether this managed effect is a failure.
 */
export function isFailure<R, E, A>(self: Managed<R, E, A>, __trace?: string) {
  return fold_(self, constTrue, constFalse, __trace)
}
