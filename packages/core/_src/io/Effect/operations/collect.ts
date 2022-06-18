/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @tsplus static ets/Effect/Ops collect
 */
export function collect<A, R, E, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, Maybe<E>, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEach(as, (a) => f(a).unsome()).map((chunk) => chunk.compact)
}
