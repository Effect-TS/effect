import type { Scope } from "../../Scope"
import type { Effect } from "../definition"
import { IGetForkScope } from "../definition"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 *
 * @ets static ets/EffectOps forkScopeWith
 */
export function forkScopeWith<R, E, A>(
  f: (scope: Scope) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return new IGetForkScope(f, __etsTrace)
}
