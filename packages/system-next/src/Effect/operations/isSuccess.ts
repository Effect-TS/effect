import { constFalse, constTrue } from "../../Function"
import type { Effect, RIO } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, boolean> {
  return fold_(self, constFalse, constTrue, __trace)
}
