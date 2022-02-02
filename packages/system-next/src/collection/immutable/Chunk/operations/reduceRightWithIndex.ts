import type { Chunk } from "../definition"
import { ArrTypeId, concrete, SingletonTypeId } from "../definition"

/**
 * Folds over the elements in this chunk from the right.
 *
 * @tsplus fluent ets/Chunk reduceRightWithIndex
 */
export function reduceRightWithIndex_<A, S>(
  self: Chunk<A>,
  s: S,
  f: (index: number, a: A, s: S) => S
): S {
  concrete(self)

  switch (self._typeId) {
    case SingletonTypeId: {
      return f(0, self.a, s)
    }
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let s1 = s
      let i = len - 1
      while (i >= 0) {
        s1 = f(i, arr[i]!, s1)
        i--
      }
      return s1
    }
    default: {
      const iterator = self._reverseArrayLikeIterator()
      let next
      let s1 = s
      let index = self.length - 1

      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = len - 1
        while (i >= 0) {
          const a = array[i]!
          s1 = f(index, a, s1)
          i--
          index--
        }
      }

      return s1
    }
  }
}

/**
 * Folds over the elements in this chunk from the right.
 *
 * @ets_data_first reduceRightWithIndex_
 */
export function reduceRightWithIndex<A, S>(s: S, f: (index: number, a: A, s: S) => S) {
  return (self: Chunk<A>): S => self.reduceRightWithIndex(s, f)
}
