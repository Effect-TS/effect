import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure in parallel, and discard the results.
 * For a sequential version, see `collectAllDiscard`.
 *
 * @ets static ets/ManagedOps collectAllParDiscard
 */
export function collectAllParDiscard<R, E, A>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  __etsTrace?: string
) {
  return Managed.forEachParDiscard(as, identity)
}
