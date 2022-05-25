/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static ets/Effect/Ops validateFirstPar
 */
export function validateFirstPar<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, Chunk<E>, B> {
  return Effect.forEachPar(as, (a) => f(a).flip()).flip()
}
