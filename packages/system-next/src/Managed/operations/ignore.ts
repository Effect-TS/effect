// ets_tracing: off

import { constVoid } from "../../Function"
import type { Managed } from "../definition"
import { fold_ } from "./fold"

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, never, void> {
  return fold_(self, constVoid, constVoid, __trace)
}
