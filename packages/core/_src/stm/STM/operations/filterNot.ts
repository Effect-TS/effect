/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 *
 * @tsplus static ets/STM/Ops filterNot
 */
export function filterNot<A, R, E>(
  as: Collection<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, Chunk<A>> {
  return STM.filter(as, (x) => f(x).map((b) => !b));
}
