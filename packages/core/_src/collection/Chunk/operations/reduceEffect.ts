import { concreteChunk, SingletonTypeId } from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Folds over the elements in this chunk from the left.
 *
 * @tsplus fluent Chunk reduceEffect
 */
export function reduceEffect_<A, R, E, S>(
  self: Chunk<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, S>,
  __tsplusTrace?: string
): Effect<R, E, S> {
  concreteChunk(self)
  if (self._typeId === SingletonTypeId) {
    return f(s, self.a)
  }
  return (self as Chunk<A>).reduce(
    Effect.succeedNow(s) as Effect<R, E, S>,
    (s, a) => s.flatMap((s1) => f(s1, a))
  )
}

/**
 * Folds over the elements in this chunk from the left.
 *
 * @tsplus static Chunk/Aspects reduceEffect
 */
export const reduceEffect = Pipeable(reduceEffect_)
