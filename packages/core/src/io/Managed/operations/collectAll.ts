import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 *
 * @tsplus static ets/ManagedOps collectAll
 */
export function collectAll<R, E, A>(
  as: LazyArg<Iterable<Managed<R, E, A>>>,
  __tsplusTrace?: string
) {
  return Managed.forEach(as, identity)
}
