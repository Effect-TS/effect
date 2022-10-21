import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Run the function across all groups, collecting the results in an
 * arbitrary order.
 *
 * @tsplus static effect/core/stream/GroupBy.Aspects mergeGroupBy
 * @tsplus pipeable effect/core/stream/GroupBy mergeGroupBy
 */
export function mergeGroupBy<R, E, K, V, A, R1, E1, A1>(
  f: (k: K, stream: Stream<never, E, V>) => Stream<R1, E1, A1>
) {
  return (self: GroupBy<R, E, K, V, A>): Stream<R | R1, E | E1, A1> => {
    concreteGroupBy(self)
    return self.apply(f)
  }
}
