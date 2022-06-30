/**
 * Reduces an `Collection<STM<R, E, A>>` to a single `STM<R, E, A>`, working
 * sequentially.
 *
 * @tsplus static effect/core/stm/STM.Ops reduceAll
 */
export function reduceAll<R, E, A>(
  a: LazyArg<STM<R, E, A>>,
  as: LazyArg<Collection<STM<R, E, A>>>,
  f: (acc: A, a: A) => A
): STM<R, E, A> {
  return STM.suspend(as().reduce(a(), (acc, a) => acc.zipWith(a, f)))
}
