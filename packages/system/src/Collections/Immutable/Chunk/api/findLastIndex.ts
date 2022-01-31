// ets_tracing: off

import * as O from "../../../../Option/index.js"
import * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Returns the last index of the element that satisfies the predicate.
 */
export function findLastIndex_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): O.Option<number> {
  Chunk.concrete(self)

  const iterator = concreteId(self).reverseArrayLikeIterator()
  let next
  let index = self.length - 1

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = len - 1
    while (i >= 0) {
      const a = array[i]!
      if (f(a)) {
        return O.some(index)
      }
      i--
      index--
    }
  }

  return O.none
}

/**
 * Returns the last index of the element that satisfies the predicate.
 *
 * @ets_data_first findLastIndex_
 */
export function findLastIndex<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => O.Option<number> {
  return (self) => findLastIndex_(self, f)
}
