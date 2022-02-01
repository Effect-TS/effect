import type { Option } from "../../../../data/Option"
import { ArrTypeId, Chunk, concrete } from "../definition"

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @tsplus fluent ets/Chunk collect
 */
export function collect_<A, B>(self: Chunk<A>, f: (a: A) => Option<B>): Chunk<B> {
  concrete(self)

  switch (self._typeId) {
    case ArrTypeId: {
      const array = self._arrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (rhs.isSome()) {
          dest = dest.append(rhs.value)
        }
      }
      return dest
    }
    default: {
      return collect_(self._materialize(), f)
    }
  }
}

/**
 * Returns a filtered, mapped subset of the elements of this chunk.
 *
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => Option<B>) {
  return (self: Chunk<A>): Chunk<B> => self.collect(f)
}
