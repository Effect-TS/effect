import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @ets static ets/ManagedOps collectAllPar
 */
export function collectAllPar<R, E, A>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  __etsTrace?: string
) {
  return Managed.forEachPar(as, identity)
}
