import * as Tp from "../../Tuple"
import type { List } from "../definition"

/**
 * Splits a list at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 * @ets fluent ets/List splitAt
 */
export function splitAt_<A>(
  self: List<A>,
  index: number
): Tp.Tuple<[List<A>, List<A>]> {
  return Tp.tuple(self.slice(0, index), self.slice(index, self.length))
}

/**
 * Splits a list at the given index and return the two sides in a pair.
 * The left side will contain all elements before but not including the
 * element at the given index. The right side contains the element at the
 * index and all elements after it.
 *
 * @complexity `O(log(n))`
 * @ets_data_first splitAt_
 */
export function splitAt(index: number) {
  return <A>(self: List<A>): Tp.Tuple<[List<A>, List<A>]> => self.splitAt(index)
}
