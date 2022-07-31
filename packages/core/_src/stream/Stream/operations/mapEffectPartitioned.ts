/**
 * Maps over elements of the stream with the specified effectful function,
 * partitioned by `p` executing invocations of `f` concurrently. The number of
 * concurrent invocations of `f` is determined by the number of different
 * outputs of type `K`. Up to `buffer` elements may be buffered per partition.
 * Transformed elements may be reordered but the order within a partition is
 * maintained.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapEffectPartitioned
 * @tsplus pipeable effect/core/stream/Stream mapEffectPartitioned
 */
export function mapEffectPartitioned<A, R2, E2, A2, K>(
  keyBy: (a: A) => K,
  f: (a: A) => Effect<R2, E2, A2>,
  buffer = 16
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> =>
    self.groupByKey(keyBy, buffer).mergeGroupBy((_, s) => s.mapEffect(f))
}
