import * as O from "../../../data/Option"
import { Effect, IOverrideForkScope } from "../definition"

export type Grafter = <R, E, A>(
  effect: Effect<R, E, A>,
  __etsTrace?: string
) => Effect<R, E, A>

/**
 * @tsplus static ets/EffectOps transplant
 */
export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.forkScopeWith((scope) =>
    f((eff, __etsTrace) => new IOverrideForkScope(eff, O.some(scope), __etsTrace))
  )
}
