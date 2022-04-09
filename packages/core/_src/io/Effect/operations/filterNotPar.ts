/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @tsplus static ets/Effect/Ops filterNotPar
 */
export function filterNotPar_<A, R, E>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.filterPar(as, (x) => f(x).map((b) => !b));
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 *
 * @tsplus static ets/Effect/Aspects filterNotPar
 */
export const filterNotPar = Pipeable(filterNotPar_);
