import { Tuple } from "../../Tuple"
import type { List } from "../definition"

/**
 * Iterate over two lists in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * list.
 * @ets fluent ets/List zip
 */
export function zip_<A, B>(self: List<A>, that: List<B>): List<Tuple<[A, B]>> {
  return self.zipWith(that, (a, b) => Tuple(a, b))
}

/**
 * Iterate over two lists in parallel and collect the pairs.
 *
 * @complexity `O(log(n))`, where `n` is the length of the smallest
 * list.
 * @ets_data_first zip_
 */
export function zip<B>(that: List<B>) {
  return <A>(self: List<A>): List<Tuple<[A, B]>> => self.zip(that)
}
