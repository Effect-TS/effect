// ets_tracing: off

import { interruptAll } from "../Fiber/index.js"
import type { Effect } from "./effect.js"
import { ensuringChildren_ } from "./ensuringChildren.js"

/**
 * Returns a new effect that will not succeed with its value before first
 * interrupting all child fibers forked by the effect.
 */
export function interruptAllChildren<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return ensuringChildren_(self, interruptAll, __trace)
}
