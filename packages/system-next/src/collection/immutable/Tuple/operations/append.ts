import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Appends a value to a tuple.
 *
 * @ets fluent ets/Tuple append
 */
export function append_<Ks extends unknown[], K>(
  self: Tuple<Ks>,
  k: K
): Tuple<[...Ks, K]> {
  return new TupleInternal([...self.value, k])
}

/**
 * Appends a value to a tuple.
 *
 * @ets_data_first append_
 */
export function append<K>(k: K) {
  return <Ks extends unknown[]>(self: Tuple<Ks>): Tuple<[...Ks, K]> => self.append(k)
}
