/**
 * Evaluate each Sync in the structure from left to right, and discard the
 * results.
 *
 * @tsplus static ets/Sync/Ops collectAllDiscard
 */
export function collectAllDiscard<R, E, A>(
  as: LazyArg<Collection<Sync<R, E, A>>>,
  __tsplusTrace?: string
) {
  return Sync.forEachDiscard(as, identity);
}
