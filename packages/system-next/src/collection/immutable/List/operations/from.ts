import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Converts an array, an array-like, or an iterable into a list.
 *
 * @complexity O(n)
 * @ets static ets/ListOps from
 */
export function from<A>(sequence: A[] | ArrayLike<A> | Iterable<A>): List<A>
export function from<A>(sequence: any): List<A> {
  const mutableList = MutableList.emptyPushable<A>()
  if (sequence.length > 0 && (sequence[0] !== undefined || 0 in sequence)) {
    for (let i = 0; i < sequence.length; ++i) {
      mutableList.push(sequence[i])
    }
  } else if (Symbol.iterator in sequence) {
    const iterator = sequence[Symbol.iterator]()
    let cur
    while (!(cur = iterator.next()).done) {
      mutableList.push(cur.value)
    }
  }
  return mutableList
}
