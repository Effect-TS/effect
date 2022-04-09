/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Combines values associated with each key into a tuple,
 * using the specified values `defaultLeft` and `defaultRight` to fill in
 * missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @tsplus fluent ets/SortedByKey zipAllSortedByKey
 * @tsplus fluent ets/Stream zipAllSortedByKey
 */
export function zipAllSortedByKey_<R, E, K, A>(
  self: SortedByKey<R, E, K, A>,
  ord: Ord<K>
) {
  return <R2, E2, B>(
    that: LazyArg<SortedByKey<R2, E2, K, B>>,
    defaultLeft: LazyArg<A>,
    defaultRight: LazyArg<B>,
    __tsplusTrace?: string
  ): Stream<R & R2, E | E2, Tuple<[K, Tuple<[A, B]>]>> =>
    self.zipAllSortedByKeyWith(ord)(
      that,
      (a) => Tuple(a, defaultRight()),
      (b) => Tuple(defaultLeft(), b),
      (a, b) => Tuple(a, b)
    );
}

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Combines values associated with each key into a tuple,
 * using the specified values `defaultLeft` and `defaultRight` to fill in
 * missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 *
 * @tsplus static ets/SortedByKey/Aspects zipAllSortedByKey
 */
export const zipAllSortedByKey = Pipeable(zipAllSortedByKey_);
