/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects groupBy
 * @tsplus pipeable effect/core/stream/Stream groupBy
 */
export function groupBy<A, R2, E2, K, V>(
  f: (a: A) => Effect<R2, E2, Tuple<[K, V]>>,
  buffer = 16,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): GroupBy<R | R2, E | E2, K, V, A> => GroupBy(self, f, buffer)
}
