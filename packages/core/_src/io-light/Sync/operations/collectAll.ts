/**
 * Evaluate each Sync in the structure from left to right, and collect the
 * results.
 *
 * @tsplus static ets/Sync/Ops collectAll
 */
export function collectAll<R, E, A>(as: LazyArg<Collection<Sync<R, E, A>>>) {
  return Sync.forEach(as, identity);
}
