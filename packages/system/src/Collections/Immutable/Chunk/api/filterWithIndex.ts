// ets_tracing: off

import type {
  PredicateWithIndex,
  RefinementWithIndex
} from "../../../../Utils/index.js"
import * as Chunk from "../core.js"
import { ArrTypeId, concrete } from "../definition.js"

/**
 * Returns a filtered subset of this chunk.
 */
export function filterWithIndex_<A, B extends A>(
  self: Chunk.Chunk<A>,
  f: RefinementWithIndex<number, A, B>
): Chunk.Chunk<B>
export function filterWithIndex_<A>(
  self: Chunk.Chunk<A>,
  f: PredicateWithIndex<number, A>
): Chunk.Chunk<A>
export function filterWithIndex_<A>(
  self: Chunk.Chunk<A>,
  f: PredicateWithIndex<number, A>
): Chunk.Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self.arrayLike()
      const len = arr.length
      let i = 0
      let builder = Chunk.empty<A>()
      while (i < len) {
        const elem = arr[i]!
        if (f(i, elem)) {
          builder = Chunk.append_(builder, elem)
        }
        i++
      }
      return builder
    }
    default: {
      const iterator = self.arrayLikeIterator()
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
            builder = Chunk.append_(builder, a)
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
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B>
export function filterWithIndex<A>(
  f: PredicateWithIndex<number, A>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A>
export function filterWithIndex<A>(
  f: PredicateWithIndex<number, A>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => filterWithIndex_(self, f)
}
