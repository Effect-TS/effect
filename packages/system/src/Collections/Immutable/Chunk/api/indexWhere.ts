import type * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Returns the first index for which the given predicate is satisfied after or at some given index.
 */
export function indexWhere_<A>(
  self: Chunk.Chunk<A>,
  from: number,
  f: (a: A) => boolean
): number {
  const iterator = concreteId(self).arrayLikeIterator()
  let next = iterator.next()
  let i = 0

  while (!next.done) {
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
    next = iterator.next()
  }

  return -1
}

/**
 * Returns the first index for which the given predicate is satisfied after or at some given index.
 *
 * @dataFirst indexWhere_
 */
export function indexWhere<A>(
  from: number,
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => number {
  return (self) => indexWhere_(self, from, f)
}
