import type { Option } from "../../../../data/Option"
import { Effect } from "../../../../io/Effect"
import { ArrTypeId, Chunk, concrete, SingletonTypeId } from "../definition"

/**
 * Returns a filtered, mapped subset of the elements of this chunk based on a
 * partial function.
 *
 * @tsplus fluent ets/Chunk collectEffect
 */
export function collectEffect_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Option<Effect<R, E, B>>,
  __etsTrace?: string
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
        }
      }
      return dest
    }
    default: {
      return collectEffect_(self._materialize(), f)
    }
  }
}

/**
 * Returns a filtered, mapped subset of the elements of this chunk based on a
 * partial function.
 *
 * @ets_data_first collectEffect_
 */
export function collectEffect<A, R, E, B>(
  f: (a: A) => Option<Effect<R, E, B>>,
  __etsTrace?: string
) {
  return (self: Chunk<A>): Effect<R, E, Chunk<B>> => self.collectEffect(f)
}
