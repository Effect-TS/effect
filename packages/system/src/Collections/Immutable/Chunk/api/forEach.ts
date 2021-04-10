import type * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Iterate over the chunk applying f
 */
export function forEach_<A, U>(self: Chunk.Chunk<A>, f: (a: A) => U): void {
  const iterator = concreteId(self).arrayLikeIterator()
  let next = iterator.next()

  while (!next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      f(a)
      i++
    }
    next = iterator.next()
  }
}

/**
 * Iterate over the chunk applying f
 *
 * @dataFirst forEach_
 */
export function forEach<A, U>(f: (a: A) => U): (self: Chunk.Chunk<A>) => void {
  return (self) => forEach_(self, f)
}
