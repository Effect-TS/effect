/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @tsplus static effect/core/io/Effect.Ops filterPar
 */
export function filterPar<A, R, E>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.forEachPar(as, (a) => f(a).map((b) => (b ? Maybe.some(a) : Maybe.none))).map((chunk) => chunk.compact)
}
