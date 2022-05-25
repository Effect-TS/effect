import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Run the function across all groups, collecting the results in an
 * arbitrary order.
 *
 * @tsplus fluent ets/GroupBy mergeGroupBy
 */
export function mergeGroupBy_<R, E, K, V, A, R1, E1, A1>(
  self: GroupBy<R, E, K, V, A>,
  f: (k: K, stream: Stream<unknown, E, V>) => Stream<R1, E1, A1>,
  __tsplusTrace?: string
): Stream<R & R1, E | E1, A1> {
  concreteGroupBy(self)
  return self.apply(f)
}

/**
 * Run the function across all groups, collecting the results in an
 * arbitrary order.
 *
 * @tsplus static ets/GroupBy/Aspects mergeGroupBy
 */
export const mergeGroupBy = Pipeable(mergeGroupBy_)
