import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static effect/core/io/Effect.Ops collectPar
 * @category constructors
 * @since 1.0.0
 */
export function collectPar<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>
): Effect<R, E, Chunk.Chunk<B>> {
  return Effect.forEachPar(as, (a) => f(a).unsome).map(Chunk.compact)
}
