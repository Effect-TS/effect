/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used to further filter down which
 * groups shall be processed.
 *
 * After calling apply on the GroupBy object, the remaining groups will be
 * processed in parallel and the resulting streams merged in a
 * nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the
 * producer is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 *
 * @tsplus fluent ets/Stream groupByKey
 */
export function groupByKey_<R, E, A, K>(
  self: Stream<R, E, A>,
  f: (a: A) => K,
  buffer = 16,
  __tsplusTrace?: string
): GroupBy<R, E, K, A, A> {
  return self.groupBy((a) => Effect.succeedNow(Tuple(f(a), a)), buffer);
}

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used to further filter down which
 * groups shall be processed.
 *
 * After calling apply on the GroupBy object, the remaining groups will be
 * processed in parallel and the resulting streams merged in a
 * nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the
 * producer is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 *
 * @tsplus static ets/Stream/Aspects groupByKey
 */
export const groupByKey = Pipeable(groupByKey_);
