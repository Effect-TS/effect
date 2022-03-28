import type { FiberScope } from "../../FiberScope"
import type { Effect } from "../definition"
import { IGetForkScope } from "../definition"

/**
 * Retrieves the scope that will be used to supervise forked effects.
 *
 * @tsplus static ets/EffectOps forkScopeWith
 */
export function forkScopeWith<R, E, A>(
  f: (scope: FiberScope) => Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return new IGetForkScope(f, __tsplusTrace)
}
