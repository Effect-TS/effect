import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Collects all the transactional effects, returning a single transactional
 * effect that produces `Unit`.
 *
 * Equivalent to `collectAll(i).unit`, but without the cost of building the
 * list of results.
 *
 * @tsplus static ets/STMOps collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Iterable<STM<R, E, A>>>
): STM<R, E, void> {
  return STM.forEachDiscard(as, identity)
}
