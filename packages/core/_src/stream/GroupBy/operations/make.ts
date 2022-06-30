import { GroupByInternal } from "@effect/core/stream/GroupBy/operations/_internal/GroupByInternal"

/**
 * Constructs a new `GroupBy`.
 *
 * @tsplus static effect/core/stream/GroupBy.Ops __call
 */
export function make<R, E, R2, E2, K, V, A>(
  stream: Stream<R, E, A>,
  key: (a: A) => Effect<R2, E2, Tuple<[K, V]>>,
  buffer: number
): GroupBy<R | R2, E | E2, K, V, A> {
  return new GroupByInternal<R | R2, E | E2, K, V, A>(stream, key, buffer)
}
