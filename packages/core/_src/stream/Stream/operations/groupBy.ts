/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @tsplus fluent ets/Stream groupBy
 */
export function groupBy_<R, R2, E, E2, A, K, V>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Tuple<[K, V]>>,
  buffer = 16,
  __tsplusTrace?: string
): GroupBy<R & R2, E | E2, K, V, A> {
  return GroupBy(self, f, buffer)
}

/**
 * More powerful version of `Stream.groupByKey`.
 *
 * @tsplus static ets/Stream/Aspects groupBy
 */
export const groupBy = Pipeable(groupBy_)
