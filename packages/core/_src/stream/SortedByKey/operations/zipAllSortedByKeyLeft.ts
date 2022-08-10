/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Keeps only values from this stream, using the specified
 * value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @tsplus static effect/core/stream/SortedByKey.Aspects zipAllSortedByKeyLeft
 * @tsplus pipeable effect/core/stream/SortedByKey zipAllSortedByKeyLeft
 * @tsplus static effect/core/stream/Stream.Aspects zipAllSortedByKeyLeft
 * @tsplus pipeable effect/core/stream/Stream zipAllSortedByKeyLeft
 */
export function zipAllSortedByKeyLeft<K, R2, E2, A2, A>(
  ord: Ord<K>,
  that: SortedByKey<R2, E2, K, A2>,
  def: A
) {
  return <R, E>(self: SortedByKey<R, E, K, A>): Stream<R | R2, E | E2, Tuple<[K, A]>> =>
    self.zipAllSortedByKeyWith(ord, that, identity, () => def, (a, _) => a)
}
