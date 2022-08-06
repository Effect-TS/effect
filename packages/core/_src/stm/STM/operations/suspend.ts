/**
 * Suspends creation of the specified transaction lazily.
 *
 * @tsplus static effect/core/stm/STM.Ops suspend
 */
export function suspend<R, E, A>(f: LazyArg<STM<R, E, A>>): STM<R, E, A> {
  return STM.sync(f).flatten
}
