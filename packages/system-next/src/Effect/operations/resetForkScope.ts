// ets_tracing: off

import * as O from "../../Option"
import type { Effect } from "../definition"
import { IOverrideForkScope } from "../definition"

/**
 * Returns a new effect that will utilize the default scope (fiber scope) to
 * supervise any fibers forked within the original effect.
 */
export function resetForkScope<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IOverrideForkScope(self, O.none, __trace)
}
