import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"
import type { Option } from "@fp-ts/data/Option"

/**
 * @tsplus getter effect/core/stream/GroupBy grouped
 * @category mutations
 * @since 1.0.0
 */
export function grouped<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>
): Stream<R, E, readonly [K, Dequeue<Exit<Option<E>, V>>]> {
  concreteGroupBy(self)
  return self.grouped()
}
