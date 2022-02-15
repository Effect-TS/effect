import type { List } from "../definition"

/**
 * Returns a list that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given list is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 * @tsplus fluent ets/List adjust
 */
export function adjust_<A>(self: List<A>, index: number, f: (a: A) => A): List<A> {
  if (index < 0 || self.length <= index) {
    return self
  }
  return self.update(index, f(self.unsafeNth(index)!))
}

/**
 * Returns a list that has the entry specified by the index replaced with
 * the value returned by applying the function to the value.
 *
 * If the index is out of bounds the given list is
 * returned unchanged.
 *
 * @complexity `O(log(n))`
 * @ets_data_first adjust_
 */
export function adjust<A>(index: number, f: (a: A) => A) {
  return (self: List<A>): List<A> => self.adjust(index, f)
}
