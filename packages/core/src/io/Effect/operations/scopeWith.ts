import type { FiberScope } from "../../FiberScope"
import { Effect } from "../definition"

/**
 * Passes the fiber's scope to the specified function, which creates an effect
 * that will be returned from this method.
 *
 * @tsplus static ets/EffectOps scopeWith
 */
export function scopeWith<R, E, A>(
  f: (scope: FiberScope) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.descriptorWith((descriptor) => f(descriptor.scope))
}
