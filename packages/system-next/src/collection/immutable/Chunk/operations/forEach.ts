import type { Chunk } from "../definition"
import { ArrTypeId, concrete } from "../definition"

/**
 * Iterate over the chunk applying `f`.
 *
 * @tsplus fluent ets/Chunk forEach
 */
export function forEach_<A, U>(self: Chunk<A>, f: (a: A) => U): void {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let i = 0
      while (i < len) {
        f(arr[i]!)
        i++
      }
      return
    }
    default: {
      const iterator = self._arrayLikeIterator()
      let next

      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = 0
        while (i < len) {
          const a = array[i]!
          f(a)
          i++
        }
      }

      return
    }
  }
}

/**
 * Iterate over the chunk applying f
 *
 * @ets_data_first forEach_
 */
export function forEach<A, U>(f: (a: A) => U) {
  return (self: Chunk<A>): void => self.forEach(f)
}
