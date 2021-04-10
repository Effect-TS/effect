import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Drops all elements so long as the predicate returns true.
 */
export function dropWhile_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): Chunk.Chunk<A> {
  const iterator = concreteId(self).arrayLikeIterator()
  let cont = true
  let i = 0
  let next = iterator.next()

  while (cont && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (cont && j < len) {
      const a = array[j]!
      if (f(a)) {
        i++
        j++
      } else {
        cont = false
      }
    }
    next = iterator.next()
  }
  return Chunk.drop_(self, i)
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @dataFirst dropWhile_
 */
export function dropWhile<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => dropWhile_(self, f)
}
