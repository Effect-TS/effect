import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Filter the groups to be processed.
 *
 * @tsplus fluent ets/GroupBy filter
 */
export function filter_<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  f: Predicate<K>,
  __tsplusTrace?: string
): GroupBy<R, E, K, V, A> {
  concreteGroupBy(self)
  return self.filter(f)
}

/**
 * Filter the groups to be processed.
 *
 * @tsplus static ets/GroupBy/Aspects filter
 */
export const filter = Pipeable(filter_)
