import type { List } from "../definition"
import { MutableList } from "../definition"
import { unsafeLast } from "./unsafeLast"

/**
 * Returns a new list without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 * @tsplus fluent ets/List dropRepeatsWith
 */
export function dropRepeatsWith_<A>(
  self: List<A>,
  f: (a: A, b: A) => boolean
): List<A> {
  return self.reduce(MutableList.emptyPushable(), (acc, a) =>
    acc.length !== 0 && f(unsafeLast(acc)!, a) ? acc : acc.push(a)
  )
}

/**
 * Returns a new list without repeated elements by using the given
 * function to determine when elements are equal.
 *
 * @complexity `O(n)`
 * @ets_data_first dropRepeatsWith_
 */
export function dropRepeatsWith<A>(f: (a: A, b: A) => boolean) {
  return (self: List<A>): List<A> => self.dropRepeatsWith(f)
}
