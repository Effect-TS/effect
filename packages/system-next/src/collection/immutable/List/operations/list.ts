import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Creates a list of the given elements.
 *
 * @complexity O(n)
 * @ets static ets/ListOps __call
 */
export function list<A>(...elements: A[]): List<A> {
  const mutableList = MutableList.emptyPushable<A>()
  for (const element of elements) {
    mutableList.push(element)
  }
  return mutableList
}
