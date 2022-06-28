/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @tsplus static effect/core/io/Effect.Ops filterNot
 */
export function filterNot<A, R, E>(
  as: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.filter(as, (x) => f(x).map((b) => !b))
}
