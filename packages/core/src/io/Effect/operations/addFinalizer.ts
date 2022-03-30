import type { LazyArg } from "../../../data/Function"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Adds a finalizer to the scope of this workflow. The finalizer is guaranteed
 * to be run when the scope is closed.
 *
 * @tsplus static ets/EffectOps addFinalizer
 */
export function addFinalizer<R, X>(
  finalizer: LazyArg<RIO<R, X>>,
  __tsplusTrace?: string
): Effect<R & HasScope, never, void> {
  return Effect.addFinalizerExit(finalizer)
}
