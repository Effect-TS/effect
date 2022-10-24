import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @tsplus static effect/core/io/Effect.Ops collect
 * @category constructors
 * @since 1.0.0
 */
export function collect<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.forEach(as, (a) => f(a).unsome).map(Chunk.compact)
}
