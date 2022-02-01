import type { Predicate } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the index of the first element that satisfies the predicate.
 *
 * @tsplus fluent ets/Chunk findIndex
 */
export function findIndex_<A>(self: Chunk<A>, f: Predicate<A>): Option<number> {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next
  let index = 0

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return Option.some(index)
      }
      i++
      index++
    }
  }

  return Option.none
}

/**
 * Returns the index of the first element that satisfies the predicate.
 *
 * @ets_data_first findIndex_
 */
export function findIndex<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Option<number> => self.findIndex(f)
}
