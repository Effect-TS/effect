import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect, IOverrideForkScope } from "../definition"

export interface Grafter {
  <R, E, A>(effect: LazyArg<Effect<R, E, A>>, __tsplusTrace?: string): Effect<R, E, A>
}

/**
 * Transplants specified effects so that when those effects fork other
 * effects, the forked effects will be governed by the scope of the fiber that
 * executes this effect.
 *
 * This can be used to "graft" deep grandchildren onto a higher-level scope,
 * effectively extending their lifespans into the parent scope.
 *
 * @tsplus static ets/EffectOps transplant
 */
export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.forkScopeWith((scope) =>
    f((effect, __tsplusTrace) =>
      Effect.suspendSucceed(
        new IOverrideForkScope(effect, () => Option.some(scope), __tsplusTrace)
      )
    )
  )
}
