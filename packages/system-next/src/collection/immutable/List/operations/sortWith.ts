import type { Ord } from "../../../../prelude/Ord"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Sort the given list by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 * @ets fluent ets/List sortWith
 */
export function sortWith_<A>(self: List<A>, ord: Ord<A>): List<A> {
  const arr: { idx: number; elm: A }[] = []
  let i = 0
  self.forEach((elm) => arr.push({ idx: i++, elm }))
  arr.sort(({ elm: a, idx: i }, { elm: b, idx: j }) => {
    const c = ord.compare(a, b)
    return c !== 0 ? c : i < j ? -1 : 1
  })
  const newL = MutableList.emptyPushable<A>()
  for (let i = 0; i < arr.length; ++i) {
    newL.push(arr[i]!.elm)
  }
  return newL
}

/**
 * Sort the given list by comparing values using the given function.
 * The function receieves two values and should return `-1` if the
 * first value is stricty larger than the second, `0` is they are
 * equal and `1` if the first values is strictly smaller than the
 * second.
 *
 * @complexity O(n * log(n))
 * @ets_data_first sortWith_
 */
export function sortWith<A>(ord: Ord<A>) {
  return (self: List<A>): List<A> => self.sortWith(ord)
}
