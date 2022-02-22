import type { Predicate } from "../../../../data/Function"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Determines whether a predicate is satisfied for all elements of this chunk.
 *
 * @tsplus fluent ets/Chunk forAll
 */
export function forAll_<A>(self: Chunk<A>, f: Predicate<A>): boolean {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (!f(a)) {
        return false
      }
      i++
    }
  }

  return true
}

/**
 * Determines whether a predicate is satisfied for all elements of this chunk.
 *
 * @ets_data_first forAll_
 */
export function forAll<A>(f: Predicate<A>) {
  return (self: Chunk<A>): boolean => self.forAll(f)
}
