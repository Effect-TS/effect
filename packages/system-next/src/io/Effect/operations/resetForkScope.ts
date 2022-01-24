import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { IOverrideForkScope } from "../definition"

/**
 * Returns a new effect that will utilize the default scope (fiber scope) to
 * supervise any fibers forked within the original effect.
 *
 * @ets fluent ets/Effect resetForkScope
 */
export function resetForkScope<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return new IOverrideForkScope(self, O.none, __trace)
}
