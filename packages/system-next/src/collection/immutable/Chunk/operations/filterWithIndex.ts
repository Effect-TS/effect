import type { PredicateWithIndex, RefinementWithIndex } from "../../../../data/Utils"
import { ArrTypeId, Chunk, concrete } from "../definition"

/**
 * Returns a filtered subset of this chunk.
 *
 * @tsplus fluent ets/Chunk filterWithIndex
 */
export function filterWithIndex_<A, B extends A>(
  self: Chunk<A>,
  f: RefinementWithIndex<number, A, B>
): Chunk<B>
export function filterWithIndex_<A>(
  self: Chunk<A>,
  f: PredicateWithIndex<number, A>
): Chunk<A>
export function filterWithIndex_<A>(
  self: Chunk<A>,
  f: PredicateWithIndex<number, A>
): Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let i = 0
      let builder = Chunk.empty<A>()
      while (i < len) {
        const elem = arr[i]!
        if (f(i, elem)) {
          builder = builder.append(elem)
        }
        i++
      }
      return builder
    }
    default: {
      const iterator = self._arrayLikeIterator()
      let next
      let builder = Chunk.empty<A>()
      let index = 0
      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = 0
        while (i < len) {
          const a = array[i]!
          if (f(index, a)) {
            builder = builder.append(a)
          }
          i++
          index++
        }
      }

      return builder
    }
  }
}

/**
 * Returns a filtered subset of this chunk.
 *
 * @ets_data_first filterWithIndex_
 */
export function filterWithIndex<A, B extends A>(
  f: RefinementWithIndex<number, A, B>
): (self: Chunk<A>) => Chunk<B>
export function filterWithIndex<A>(
  f: PredicateWithIndex<number, A>
): (self: Chunk<A>) => Chunk<A>
export function filterWithIndex<A>(f: PredicateWithIndex<number, A>) {
  return (self: Chunk<A>): Chunk<A> => self.filterWithIndex(f)
}
