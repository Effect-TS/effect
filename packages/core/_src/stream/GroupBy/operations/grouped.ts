import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * @tsplus getter effect/core/stream/GroupBy grouped
 */
export function grouped<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>
): Stream<R, E, Tuple<[K, Dequeue<Exit<Maybe<E>, V>>]>> {
  concreteGroupBy(self)
  return self.grouped()
}
