/**
 * Collects all the transactional effects, returning a single transactional
 * effect that produces `Unit`.
 *
 * Equivalent to `collectAll(i).unit`, but without the cost of building the
 * list of results.
 *
 * @tsplus static ets/STM/Ops collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Collection<STM<R, E, A>>>
): STM<R, E, void> {
  return STM.forEachDiscard(as, identity)
}
