import {
  ArrTypeId,
  Chunk,
  concreteChunk,
  SingletonTypeId
} from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Returns a filtered, mapped subset of the elements of this chunk based on a
 * partial function.
 *
 * @tsplus fluent Chunk collectEffect
 */
export function collectEffect_<A, R, E, B>(
  self: Chunk<A>,
  f: (a: A) => Maybe<Effect<R, E, B>>
): Effect<R, E, Chunk<B>> {
  concreteChunk(self)

  switch (self._typeId) {
    case SingletonTypeId: {
      return f(self.a).fold(
        () => Effect.succeed(Chunk.empty()),
        (b) => b.map(Chunk.single)
      )
    }
    case ArrTypeId: {
      const array = self._arrayLike()
      let dest: Effect<R, E, Chunk<B>> = Effect.succeed(Chunk.empty<B>())
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
 * @tsplus static Chunk/Aspects collectEffect
 */
export const collectEffect = Pipeable(collectEffect_)
