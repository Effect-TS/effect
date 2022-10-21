import { concreteGroupBy } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Only consider the first `n` groups found in the stream.
 *
 * @tsplus static effect/core/stream/GroupBy.Aspects first
 * @tsplus pipeable effect/core/stream/GroupBy first
 */
export function first(n: number) {
  return <R, E, K, V, A>(self: GroupBy<R, E, K, V, A>): GroupBy<R, E, K, V, A> => {
    concreteGroupBy(self)
    return self.first(n)
  }
}
