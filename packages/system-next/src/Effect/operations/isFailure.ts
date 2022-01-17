import { constFalse, constTrue } from "../../Function"
import type { Effect, RIO } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, boolean> {
  return fold_(self, constTrue, constFalse, __trace)
}
