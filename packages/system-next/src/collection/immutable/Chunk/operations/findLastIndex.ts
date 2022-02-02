import type { Predicate } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concrete, concreteId } from "../definition"

/**
 * Returns the last index of the element that satisfies the predicate.
 *
 * @tsplus fluent ets/Chunk findLastIndex
 */
export function findLastIndex_<A>(self: Chunk<A>, f: Predicate<A>): Option<number> {
  concrete(self)

  const iterator = concreteId(self)._reverseArrayLikeIterator()
  let next
  let index = self.length - 1

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = len - 1
    while (i >= 0) {
      const a = array[i]!
      if (f(a)) {
        return Option.some(index)
      }
      i--
      index--
    }
  }

  return Option.none
}

/**
 * Returns the last index of the element that satisfies the predicate.
 *
 * @ets_data_first findLastIndex_
 */
export function findLastIndex<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Option<number> => self.findLastIndex(f)
}
