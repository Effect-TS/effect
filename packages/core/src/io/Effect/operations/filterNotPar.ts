/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @tsplus static effect/core/io/Effect.Ops filterNotPar
 */
export function filterNotPar<A, R, E>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.filterPar(as, (x) => f(x).map((b) => !b))
}
