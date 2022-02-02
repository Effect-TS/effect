// ets_tracing: off

import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Returns the first index for which the given predicate is satisfied after or at some given index.
 */
export function indexWhereFrom_<A>(
  self: Chunk.Chunk<A>,
  from: number,
  f: (a: A) => boolean
): number {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let i = 0

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    if (i + len - 1 >= from) {
      let j = 0
      while (j < len) {
        const a = array[j]!
        if (i >= from && f(a)) {
          return i
        }
        j++
        i++
      }
    } else {
      i += len
    }
  }

  return -1
}

/**
 * Returns the first index for which the given predicate is satisfied after or at some given index.
 *
 * @ets_data_first indexWhereFrom_
 */
export function indexWhereFrom<A>(
  from: number,
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => number {
  return (self) => indexWhereFrom_(self, from, f)
}
