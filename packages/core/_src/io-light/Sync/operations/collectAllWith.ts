/**
 * Evaluate each Sync in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @tsplus static ets/Sync/Ops collectAllWith
 */
export function collectAllWith<R, E, A, B>(
  as: LazyArg<Collection<Sync<R, E, A>>>,
  pf: (a: A) => Option<B>,
  __trace?: string
): Sync<R, E, Chunk<B>> {
  return Sync.collectAll(as).map((chunk) => chunk.collect(pf));
}
