import type { Tuple } from "../definition"

/**
 * Gets an element from the tuple.
 *
 * @tsplus fluent ets/Tuple at
 */
export function at_<Ks extends unknown[], I extends keyof Ks>(
  self: Tuple<Ks>,
  i: I
): Ks[I] {
  return self.get(i)
}

/**
 * Gets an element from the tuple.
 *
 * @ets_data_first at_
 */
export function at<Ks extends unknown[], I extends keyof Ks>(i: I) {
  return (self: Tuple<Ks>): Ks[I] => self.at(i)
}
