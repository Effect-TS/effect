import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect, IOverrideForkScope } from "../definition"

export type Grafter = <R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
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
    f(
      (effect, __etsTrace) =>
        new IOverrideForkScope(effect, () => Option.some(scope), __etsTrace)
    )
  )
}
