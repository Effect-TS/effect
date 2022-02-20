import { Option } from "../../../data/Option"
import type { Effect } from "../definition"
import { IOverrideForkScope } from "../definition"

/**
 * Returns a new effect that will utilize the default scope (fiber scope) to
 * supervise any fibers forked within the original effect.
 *
 * @tsplus fluent ets/Effect resetForkScope
 */
export function resetForkScope<R, E, A>(
  self: Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return new IOverrideForkScope(
    () => self,
    () => Option.none,
    __etsTrace
  )
}
