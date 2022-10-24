import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @tsplus static effect/core/io/Effect.Ops filterNotPar
 * @category filtering
 * @since 1.0.0
 */
export function filterNotPar<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.filterPar(as, (x) => f(x).map((b) => !b))
}
