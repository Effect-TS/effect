import type { List } from "../definition"
import { map_ } from "./map"

/**
 * This is like mapping over two lists at the same time. The two lists
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new list.
 *
 * The shortest list determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * list.
 * @ets fluent ets/List zipWith
 */
export function zipWith_<A, B, C>(
  self: List<A>,
  that: List<B>,
  f: (a: A, b: B) => C
): List<C> {
  const swapped = that.length < self.length
  const iterator = (swapped ? self : that)[Symbol.iterator]()
  return map_((swapped ? that : self) as any, (a: any) => {
    const b: any = iterator.next().value
    return swapped ? f(b, a) : f(a, b)
  })
}

/**
 * This is like mapping over two lists at the same time. The two lists
 * are iterated over in parallel and each pair of elements is passed
 * to the function. The returned values are assembled into a new list.
 *
 * The shortest list determines the size of the result.
 *
 * @complexity `O(log(n))` where `n` is the length of the smallest
 * list.
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(that: List<B>, f: (a: A, b: B) => C) {
  return (self: List<A>): List<C> => self.zipWith(that, f)
}
