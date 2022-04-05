/**
 * Collects all the transactional effects in a collection, returning a single
 * transactional effect that produces a collection of values.
 *
 * @tsplus static ets/STM/Ops collectAll
 */
export function collectAll<R, E, A>(
  as: LazyArg<Collection<STM<R, E, A>>>
): STM<R, E, Chunk<A>> {
  return STM.forEach(as, identity);
}
