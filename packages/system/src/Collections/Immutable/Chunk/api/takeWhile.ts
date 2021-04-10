import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Takes all elements so long as the predicate returns true.
 */
export function takeWhile_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): Chunk.Chunk<A> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let cont = true
  let i = 0

  while (cont && (next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (cont && j < len) {
      const a = array[j]!
      if (!f(a)) {
        cont = false
      } else {
        i++
        j++
      }
    }
  }

  return Chunk.take_(self, i)
}

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @dataFirst takeWhile_
 */
export function takeWhile<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => takeWhile_(self, f)
}
