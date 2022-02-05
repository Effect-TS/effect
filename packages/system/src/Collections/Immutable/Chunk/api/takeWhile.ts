// ets_tracing: off

import * as Chunk from "../core.js"
import { ArrTypeId, concrete } from "../definition.js"

/**
 * Takes all elements so long as the predicate returns true.
 */
export function takeWhile_<A>(
  self: Chunk.Chunk<A>,
  f: (a: A) => boolean
): Chunk.Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self.arrayLike()
      const len = arr.length
      let i = 0
      while (i < len && f(arr[i]!)) {
        i++
      }
      return Chunk.take_(self, i)
    }
    default: {
      const iterator = self.arrayLikeIterator()
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
  }
}

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @ets_data_first takeWhile_
 */
export function takeWhile<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => takeWhile_(self, f)
}
