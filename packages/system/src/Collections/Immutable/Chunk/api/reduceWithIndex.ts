import type * as Chunk from "../core"
import { ArrTypeId, concrete, SingletonTypeId } from "../definition"

/**
 * Folds over the elements in this chunk from the left.
 */
export function reduceWithIndex_<A, S>(
  self: Chunk.Chunk<A>,
  s: S,
  f: (s: S, index: number, a: A) => S
): S {
  concrete(self)

  switch (self._typeId) {
    case SingletonTypeId: {
      return f(s, 0, self.a)
    }
    case ArrTypeId: {
      const arr = self.arrayLike()
      const len = arr.length
      let s1 = s
      let i = 0
      while (i < len) {
        s1 = f(s1, i, arr[i]!)
        i++
      }
      return s1
    }
    default: {
      const iterator = self.arrayLikeIterator()
      let next
      let s1 = s

      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = 0
        while (i < len) {
          const a = array[i]!
          s1 = f(s1, i, a)
          i++
        }
      }

      return s1
    }
  }
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @ets_data_first reduceWithIndex_
 */
export function reduceWithIndex<A, S>(
  s: S,
  f: (s: S, index: number, a: A) => S
): (self: Chunk.Chunk<A>) => S {
  return (self) => reduceWithIndex_(self, s, f)
}
