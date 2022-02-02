// ets_tracing: off

import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Determines whether a predicate is satisfied for all elements of this chunk.
 */
export function forAny_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): boolean {
  const iterator = concreteId(self).arrayLikeIterator()
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
export function forAny<A>(f: (a: A) => boolean): (self: Chunk.Chunk<A>) => boolean {
  return (self) => forAny_(self, f)
}
