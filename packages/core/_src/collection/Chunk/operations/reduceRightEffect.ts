import { concreteChunk, SingletonTypeId } from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Folds over the elements in this chunk from the right.
 *
 * @tsplus fluent Chunk reduceRightEffect
 */
export function reduceRightEffect_<A, R, E, S>(
  self: Chunk<A>,
  s: S,
  f: (a: A, s: S) => Effect<R, E, S>
): Effect<R, E, S> {
  concreteChunk(self)
  if (self._typeId === SingletonTypeId) {
    return f(self.a, s)
  }
  return (self as Chunk<A>).reduceRight(
    Effect.succeed(s) as Effect<R, E, S>,
    (a, s) => s.flatMap((s1) => f(a, s1))
  )
}

/**
 * Folds over the elements in this chunk from the right.
 *
 * @tsplus static Chunk/Aspects reduceRightEffect
 */
export const reduceRightEffect = Pipeable(reduceRightEffect_)
