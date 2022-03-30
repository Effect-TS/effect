import { Option } from "../../../data/Option"
import { FiberScope } from "../../FiberScope"
import { Effect, IOverrideForkScope } from "../definition"

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @tsplus fluent ets/Effect daemonChildren
 */
export function daemonChildren<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(
    new IOverrideForkScope(
      () => self,
      () => Option.some(FiberScope.global.value),
      __tsplusTrace
    )
  )
}
