/**
 * Feeds elements of type `A` to `f` until it succeeds. Returns first success
 * or the accumulation of all errors.
 *
 * @tsplus static ets/STM/Ops validateFirst
 */
export function validateFirst<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, Chunk<E>, B> {
  return STM.forEach(as, (a) => f(a).flip()).flip()
}
