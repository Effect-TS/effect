import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal";

/**
 * Only consider the first `n` groups found in the stream.
 *
 * @tsplus fluent ets/GroupBy first
 */
export function first_<R, E, K, V, A>(
  self: GroupBy<R, E, K, V, A>,
  n: number
): GroupBy<R, E, K, V, A> {
  concreteGroupBy(self);
  return self.first(n);
}

/**
 * Only consider the first `n` groups found in the stream.
 *
 * @tsplus static ets/GroupBy/Aspects first
 */
export const first = Pipeable(first_);
