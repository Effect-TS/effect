import type { Option } from "../../../../data/Option"
import { ArrTypeId, Chunk, concrete } from "../definition"

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @tsplus fluent ets/Chunk collectWithIndex
 */
export function collectWithIndex_<A, B>(
  self: Chunk<A>,
  f: (index: number, a: A) => Option<B>
): Chunk<B> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const array = self._arrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(i, array[i]!)
        if (rhs.isSome()) {
          dest = dest.append(rhs.value)
        }
      }
      return dest
    }
    default: {
      return collectWithIndex_(self._materialize(), f)
    }
  }
}

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @ets_data_first collectWithIndex_
 */
export function collectWithIndex<A, B>(f: (index: number, a: A) => Option<B>) {
  return (self: Chunk<A>): Chunk<B> => self.collectWithIndex(f)
}
