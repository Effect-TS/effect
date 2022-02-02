import type { Predicate, Refinement } from "../../../../data/Function"
import { ArrTypeId, Chunk, concrete } from "../definition"

/**
 * Returns a filtered subset of this chunk.
 *
 * @tsplus fluent ets/Chunk filter
 */
export function filter_<A, B extends A>(self: Chunk<A>, f: Refinement<A, B>): Chunk<B>
export function filter_<A>(self: Chunk<A>, f: Predicate<A>): Chunk<A>
export function filter_<A>(self: Chunk<A>, f: Predicate<A>): Chunk<A> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const arr = self._arrayLike()
      const len = arr.length
      let i = 0
      let builder = Chunk.empty<A>()
      while (i < len) {
        const elem = arr[i]!
        if (f(elem)) {
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
      while ((next = iterator.next()) && !next.done) {
        const array = next.value
        const len = array.length
        let i = 0
        while (i < len) {
          const a = array[i]!
          if (f(a)) {
            builder = builder.append(a)
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
): (self: Chunk<A>) => Chunk<B>
export function filter<A>(f: Predicate<A>): (self: Chunk<A>) => Chunk<A>
export function filter<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Chunk<A> => self.filter(f)
}
