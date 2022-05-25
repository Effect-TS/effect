/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @tsplus static ets/Effect/Ops collectPar
 */
export function collectPar<A, R, E, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(as, (a) => f(a).unsome()).map((chunk) => chunk.compact())
}
