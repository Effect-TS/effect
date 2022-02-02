import type { Predicate } from "packages/system-next/src/data/Function"

import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Determines whether a predicate is satisfied for all elements of this chunk.
 *
 * @tsplus fluent ets/Chunk forAny
 */
export function forAny_<A>(self: Chunk<A>, f: Predicate<A>): boolean {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return true
      }
      i++
    }
  }

  return false
}

/**
 * Determines whether a predicate is satisfied for all elements of this chunk.
 *
 * @ets_data_first forAll_
 */
export function forAny<A>(f: (a: A) => boolean) {
  return (self: Chunk<A>): boolean => self.forAny(f)
}
