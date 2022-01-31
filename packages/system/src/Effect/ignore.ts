// ets_tracing: off

import { constVoid } from "../Function/index.js"
import type { Effect, RIO } from "./effect.js"
import { fold_ } from "./fold.js"

/**
 * Returns a new effect that ignores the success or failure of this effect.
 */
export function ignore<R, E, A>(self: Effect<R, E, A>, __trace?: string): RIO<R, void> {
  return fold_(self, constVoid, constVoid, __trace)
}
