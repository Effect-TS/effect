/**
 * Fails with the specified error if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrFail
 * @tsplus pipeable effect/core/stm/STM filterOrFail
 */
export function filterOrFail<A, B extends A, E1>(
  f: Refinement<A, B>,
  e: LazyArg<E1>
): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, B>
export function filterOrFail<A, E1>(
  f: Predicate<A>,
  e: LazyArg<E1>
): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, A>
export function filterOrFail<A, E1>(f: Predicate<A>, e: LazyArg<E1>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> => self.filterOrElse(f, STM.fail(e))
}
