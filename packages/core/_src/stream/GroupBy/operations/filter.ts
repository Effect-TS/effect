import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Filter the groups to be processed.
 *
 * @tsplus static effect/core/stream/GroupBy.Aspects filter
 * @tsplus pipeable effect/core/stream/GroupBy filter
 */
export function filter<K>(f: Predicate<K>, __tsplusTrace?: string) {
  return <R, E, V, A>(self: GroupBy<R, E, K, V, A>): GroupBy<R, E, K, V, A> => {
    concreteGroupBy(self)
    return self.filter(f)
  }
}
