import type { Option } from "../../../../data/Option"
import { ArrTypeId, Chunk, concrete, SingletonTypeId } from "../definition"

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @tsplus fluent ets/Chunk collectWhile
 */
export function collectWhile_<A, B>(self: Chunk<A>, f: (a: A) => Option<B>): Chunk<B> {
  concrete(self)

  switch (self._typeId) {
    case SingletonTypeId: {
      return f(self.a).fold(() => Chunk.empty(), Chunk.single)
    }
    case ArrTypeId: {
      const array = self._arrayLike()
      let dest = Chunk.empty<B>()
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (rhs.isSome()) {
          dest = dest.append(rhs.value)
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhile_(self._materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial function is defined.
 *
 * @ets_data_first collectWhile_
 */
export function collectWhile<A, B>(f: (a: A) => Option<B>) {
  return (self: Chunk<A>): Chunk<B> => self.collectWhile(f)
}
