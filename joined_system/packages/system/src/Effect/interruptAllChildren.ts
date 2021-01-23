import { interruptAll } from "../Fiber"
import type { Effect } from "./effect"
import { ensuringChildren_ } from "./ensuringChildren"

/**
 * Returns a new effect that will not succeed with its value before first
 * interrupting all child fibers forked by the effect.
 */
export function interruptAllChildren<R, E, A>(self: Effect<R, E, A>) {
  return ensuringChildren_(self, interruptAll)
}
