import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { identity } from "../../../data/Function"
import type { Ord } from "../../../prelude/Ord"
import type { Stream } from "../../Stream"
import type { SortedByKey } from "../definition"

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
 * @tsplus fluent ets/SortedByKey zipAllSortedByKeyLeft
 * @tsplus fluent ets/Stream zipAllSortedByKeyLeft
 */
export function zipAllSortedByKeyLeft_<R, E, K, A>(
  self: SortedByKey<R, E, K, A>,
  ord: Ord<K>
) {
  return <R2, E2, B>(
    that: LazyArg<SortedByKey<R2, E2, K, B>>,
    def: LazyArg<A>,
    __tsplusTrace?: string
  ): Stream<R & R2, E | E2, Tuple<[K, A]>> =>
    self.zipAllSortedByKeyWith(ord)(that, identity, def, (a, _) => a)
}

/**
 * Zips this stream that is sorted by distinct keys and the specified stream
 * that is sorted by distinct keys to produce a new stream that is sorted by
 * distinct keys. Keeps only values from this stream, using the specified
 * value `default` to fill in missing values.
 *
 * This allows zipping potentially unbounded streams of data by key in
 * constant space but the caller is responsible for ensuring that the
 * streams are sorted by distinct keys.
 */
export const zipAllSortedByKeyLeft = Pipeable(zipAllSortedByKeyLeft_)
