import type { Predicate } from "../../../../data/Function"
import type { Chunk } from "../definition"
import { ArrTypeId, concrete } from "../definition"

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @tsplus fluent ets/Chunk takeWhile
 */
export function takeWhile_<A>(self: Chunk<A>, f: Predicate<A>): Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let i = 0
      while (i < len && f(arr[i]!)) {
        i++
      }
      return self._take(i)
    }
    default: {
      const iterator = self._arrayLikeIterator()
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

      return self._take(i)
    }
  }
}

/**
 * Takes all elements so long as the predicate returns true.
 *
 * @ets_data_first takeWhile_
 */
export function takeWhile<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Chunk<A> => self.takeWhile(f)
}
