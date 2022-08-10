/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Keeps only values from that stream, using the specified
 * value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @tsplus static effect/core/stream/SortedByKey.Aspects zipAllSortedByKeyRight
 * @tsplus pipeable effect/core/stream/SortedByKey zipAllSortedByKeyRight
 * @tsplus static effect/core/stream/Stream.Aspects zipAllSortedByKeyRight
 * @tsplus pipeable effect/core/stream/Stream zipAllSortedByKeyRight
 */
export function zipAllSortedByKeyRight<K, R2, E2, A2>(
  ord: Ord<K>,
  that: SortedByKey<R2, E2, K, A2>,
  def: A2
) {
  return <R, E, A>(self: SortedByKey<R, E, K, A>): Stream<R | R2, E | E2, Tuple<[K, A2]>> =>
    self.zipAllSortedByKeyWith(ord, that, () => def, identity, (_, b) => b)
}
