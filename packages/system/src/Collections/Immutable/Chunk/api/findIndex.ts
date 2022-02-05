// ets_tracing: off

import * as O from "../../../../Option/index.js"
import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Returns the index of the first element that satisfies the predicate.
 */
export function findIndex_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): O.Option<number> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let index = 0

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return O.some(index)
      }
      i++
      index++
    }
  }

  return O.none
}

/**
 * Returns the index of the first element that satisfies the predicate.
 *
 * @ets_data_first findIndex_
 */
export function findIndex<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => O.Option<number> {
  return (self) => findIndex_(self, f)
}
