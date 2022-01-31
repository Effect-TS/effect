import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Prepends a value to a tuple.
 *
 * @ets fluent ets/Tuple prepend
 */
export function prepend_<Ks extends unknown[], K>(
  self: Tuple<Ks>,
  k: K
): Tuple<[K, ...Ks]> {
  return new TupleInternal([k, ...self.tuple])
}

/**
 * Appends a value to a tuple.
 *
 * @ets_data_first prepend_
 */
export function prepend<K>(k: K) {
  return <Ks extends unknown[]>(self: Tuple<Ks>): Tuple<[K, ...Ks]> => self.prepend(k)
}
