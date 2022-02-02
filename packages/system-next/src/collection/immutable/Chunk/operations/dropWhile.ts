import type { Chunk } from "../definition"
import { ArrTypeId, concrete } from "../definition"

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus fluent ets/Chunk dropWhile
 */
export function dropWhile_<A>(self: Chunk<A>, f: (a: A) => boolean): Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let i = 0
      while (i < len && f(arr[i]!)) {
        i++
      }
      return (self as Chunk<A>).drop(i)
    }
    default: {
      const iterator = self._arrayLikeIterator()
      let cont = true
      let i = 0
      let next

      while (cont && (next = iterator.next()) && !next.done) {
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
      }
      return (self as Chunk<A>).drop(i)
    }
  }
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @ets_data_first dropWhile_
 */
export function dropWhile<A>(f: (a: A) => boolean) {
  return (self: Chunk<A>): Chunk<A> => self.dropWhile(f)
}
