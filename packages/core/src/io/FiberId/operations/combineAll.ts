import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"

/**
 * Combines a set of `FiberId`s into a single `FiberId`.
 *
 * @tsplus static effect/core/io/FiberId.Ops combineAll
 * @category constructors
 * @since 1.0.0
 */
export function combineAll(fiberIds: HashSet.HashSet<FiberId>): FiberId {
  return pipe(fiberIds, HashSet.reduce(FiberId.none, (a, b) => a + b))
}
