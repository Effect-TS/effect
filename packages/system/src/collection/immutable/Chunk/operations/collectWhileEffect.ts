import type { Option } from "../../../../data/Option"
import { Effect } from "../../../../io/Effect"
import { ArrTypeId, Chunk, concrete, SingletonTypeId } from "../definition"

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @tsplus fluent ets/Chunk collectWhileEffect
 */
export function collectWhileEffect_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Option<Effect<R, E, B>>
): Effect<R, E, Chunk<B>> {
  concrete(self)

  switch (self._typeId) {
    case SingletonTypeId: {
      return f(self.a).fold(
        () => Effect.succeedNow(Chunk.empty()),
        (b) => b.map(Chunk.single)
      )
    }
    case ArrTypeId: {
      const array = self._arrayLike()
      let dest: Effect<R, E, Chunk<B>> = Effect.succeedNow(Chunk.empty<B>())
      for (let i = 0; i < array.length; i++) {
        const rhs = f(array[i]!)
        if (rhs.isSome()) {
          dest = dest.zipWith(rhs.value, (a, b) => a.append(b))
        } else {
          return dest
        }
      }
      return dest
    }
    default: {
      return collectWhileEffect_(self._materialize(), f)
    }
  }
}

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @ets_data_first collectWhileEffect_
 */
export function collectWhileEffect<A, R, E, B>(
  f: (a: A) => Option<Effect<R, E, B>>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<B>> => self.collectWhileEffect(f)
}
