import type { List } from "../definition"
import { MutableList } from "../definition"
import { unsafeLast } from "./unsafeLast"

/**
 * Folds a function over a list from left to right while collecting
 * all the intermediate steps in a resulting list.
 *
 * @tsplus fluent ets/List scan
 */
export function scan_<A, B>(
  self: List<A>,
  initial: B,
  f: (acc: B, value: A) => B
): List<B> {
  return self.reduce(MutableList.emptyPushable<B>().push(initial), (acc, a) =>
    acc.push(f(unsafeLast(acc)!, a))
  )
}

/**
 * Folds a function over a list from left to right while collecting
 * all the intermediate steps in a resulting list.
 *
 * @ets_data_first scan_
 */
export function scan<A, B>(initial: B, f: (acc: B, value: A) => B) {
  return (self: List<A>): List<B> => self.scan(initial, f)
}
