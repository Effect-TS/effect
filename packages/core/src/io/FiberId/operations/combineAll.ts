import type { HashSet } from "../../../collection/immutable/HashSet"
import { FiberId } from "../definition"

/**
 * Combines a set of `FiberId`s into a single `FiberId`.
 *
 * @tsplus static ets/FiberIdOps combineAll
 */
export function combineAll(fiberIds: HashSet<FiberId>): FiberId {
  return fiberIds.reduce(FiberId.none, (a, b) => a + b)
}
