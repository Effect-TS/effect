import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Evaluate each Sync in the structure from left to right, and discard the
 * results.
 *
 * @tsplus static ets/SyncOps collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Iterable<Sync<R, E, A>>>,
  __tsplusTrace?: string
) {
  return Sync.forEachDiscard(as, identity)
}
