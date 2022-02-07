// ets_tracing: off

import type { Refinement } from "../../../../Function/index.js"
import * as Chunk from "../core.js"
import { ArrTypeId, concrete } from "../definition.js"

/**
 * Returns a filtered subset of this chunk.
 */
export function filter_<A, B extends A>(
  self: Chunk.Chunk<A>,
  f: Refinement<A, B>
): Chunk.Chunk<B>
export function filter_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): Chunk.Chunk<A>
export function filter_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): Chunk.Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self.arrayLike()
      const len = arr.length
      let i = 0
      let builder = Chunk.empty<A>()
      while (i < len) {
        const elem = arr[i]!
        if (f(elem)) {
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
      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = 0
        while (i < len) {
          const a = array[i]!
          if (f(a)) {
            builder = Chunk.append_(builder, a)
          }
          i++
        }
      }

      return builder
    }
  }
}

/**
 * Returns a filtered subset of this chunk.
 *
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B>
export function filter<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A>
export function filter<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => filter_(self, f)
}
