import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * @tsplus fluent ets/GroupBy grouped
 */
export function grouped<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  __tsplusTrace?: string
): Stream<R, E, Tuple<[K, Dequeue<Exit<Maybe<E>, V>>]>> {
  concreteGroupBy(self)
  return self.grouped()
}
