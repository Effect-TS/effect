/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @tsplus static ets/Effect/Ops filterPar
 */
export function filterPar_<A, R, E>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.forEachPar(as, (a) => f(a).map((b) => (b ? Option.some(a) : Option.none))).map((chunk) => chunk.compact)
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @tsplus static ets/Effect/Aspects filterPar
 */
export const filterPar = Pipeable(filterPar_)
