import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { Sync } from "../definition"

/**
 * Evaluate each Sync in the structure from left to right, and collect the
 * results.
 *
 * @tsplus static ets/SyncOps collectAll
 */
export function collectAll<R, E, A>(as: LazyArg<Iterable<Sync<R, E, A>>>) {
  return Sync.forEach(as, identity)
}
