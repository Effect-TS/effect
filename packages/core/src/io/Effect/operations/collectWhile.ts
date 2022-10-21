import { ArrTypeId, concreteChunk, SingletonTypeId } from "@tsplus/stdlib/collections/Chunk"

/**
 * Transforms all elements of the chunk for as long as the specified partial
 * function is defined.
 *
 * @tsplus static effect/core/io/Effect.Ops collectWhile
 */
export function collectWhile<A, R, E, B>(
  self: Collection<A>,
  f: (a: A) => Maybe<Effect<R, E, B>>
): Effect<R, E, Chunk<B>> {
  const chunk = Chunk.from(self)
  concreteChunk(chunk)
  switch (chunk._typeId) {
    case SingletonTypeId: {
      return f(chunk.a).fold(
        () => Effect.succeed(Chunk.empty()),
        (b) => b.map(Chunk.single)
      )
    }
    case ArrTypeId: {
      const array = chunk._arrayLike()
      let dest: Effect<R, E, Chunk<B>> = Effect.succeed(Chunk.empty<B>())
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
      return collectWhile(chunk._materialize(), f)
    }
  }
}
