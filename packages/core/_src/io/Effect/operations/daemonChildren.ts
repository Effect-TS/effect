import { IOverrideForkScope } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns a new workflow that will not supervise any fibers forked by this
 * workflow.
 *
 * @tsplus getter effect/core/io/Effect daemonChildren
 */
export function daemonChildren<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  return Effect.suspendSucceed(new IOverrideForkScope(self, Maybe.some(FiberScope.global)))
}
