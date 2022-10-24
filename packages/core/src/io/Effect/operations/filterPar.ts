import * as Chunk from "@fp-ts/data/Chunk"
import * as Option from "@fp-ts/data/Option"

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @tsplus static effect/core/io/Effect.Ops filterPar
 * @category filtering
 * @since 1.0.0
 */
export function filterPar<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return Effect.forEachPar(
    as,
    (a) => f(a).map((b) => (b ? Option.some(a) : Option.none))
  ).map(Chunk.compact)
}
