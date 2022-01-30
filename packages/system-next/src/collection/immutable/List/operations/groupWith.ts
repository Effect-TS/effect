import type { List } from "../definition"
import { MutableList } from "../definition"
import { unsafeLast } from "./unsafeLast"

/**
 * Returns a list of lists where each sublist's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the list should be sorted
 * before grouping.
 *
 * @ets fluent ets/List groupWith
 */
export function groupWith_<A>(
  self: List<A>,
  f: (a: A, b: A) => boolean
): List<List<A>> {
  const result = MutableList.emptyPushable<MutableList<A>>()
  let buffer = MutableList.emptyPushable<A>()
  self.forEach((a) => {
    if (buffer.length !== 0 && !f(unsafeLast(buffer)!, a)) {
      result.push(buffer)
      buffer = MutableList.emptyPushable()
    }
    buffer.push(a)
  })
  return buffer.length === 0 ? result : result.push(buffer)
}

/**
 * Returns a list of lists where each sublist's elements are pairwise
 * equal based on the given comparison function.
 *
 * Note that only adjacent elements are compared for equality. If all
 * equal elements should be grouped together the list should be sorted
 * before grouping.
 *
 * @ets_data_first groupWith_
 */
export function groupWith<A>(f: (a: A, b: A) => boolean) {
  return (self: List<A>): List<List<A>> => self.groupWith(f)
}
