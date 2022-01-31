import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllParDiscard`.
 *
 * @tsplus static ets/ManagedOps collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  __etsTrace?: string
) {
  return Managed.forEachDiscard(as, identity)
}
