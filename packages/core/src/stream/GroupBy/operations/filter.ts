import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"
import type { Predicate } from "@fp-ts/data/Predicate"

/**
 * Filter the groups to be processed.
 *
 * @tsplus static effect/core/stream/GroupBy.Aspects filter
 * @tsplus pipeable effect/core/stream/GroupBy filter
 * @category filtering
 * @since 1.0.0
 */
export function filter<K>(f: Predicate<K>) {
  return <R, E, V, A>(self: GroupBy<R, E, K, V, A>): GroupBy<R, E, K, V, A> => {
    concreteGroupBy(self)
    return self.filter(f)
  }
}
