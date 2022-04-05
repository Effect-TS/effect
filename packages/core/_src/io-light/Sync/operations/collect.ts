/**
 * Evaluate each Sync in the structure from left to right, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/Sync/Ops collect
 */
export function collect<A, R, E, B>(
  self: Collection<A>,
  f: (a: A) => Sync<R, Option<E>, B>
): Sync<R, E, Chunk<B>> {
  return Sync.forEach(self, (a) => f(a).optional()).map((chunk) => chunk.compact());
}
