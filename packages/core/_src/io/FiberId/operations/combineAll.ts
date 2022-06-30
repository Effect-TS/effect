/**
 * Combines a set of `FiberId`s into a single `FiberId`.
 *
 * @tsplus static effect/core/io/FiberId.Ops combineAll
 */
export function combineAll(fiberIds: HashSet<FiberId>): FiberId {
  return fiberIds.reduce(FiberId.none, (a, b) => a + b)
}
