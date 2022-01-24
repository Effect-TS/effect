import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { IOverrideForkScope } from "../definition"
import { forkScopeWith } from "./forkScopeWith"

export type Grafter = <R, E, A>(
  effect: Effect<R, E, A>,
  __etsTrace?: string
) => Effect<R, E, A>

/**
 * @ets static ets/EffectOps transplant
 */
export function transplant<R, E, A>(
  f: (grafter: Grafter) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return forkScopeWith(
    (scope) =>
      f((eff, __etsTrace) => new IOverrideForkScope(eff, O.some(scope), __etsTrace)),
    __etsTrace
  )
}
