/**
 * Fails with the specified error if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrFail
 */
export function filterOrFail_<R, E, A, B extends A, E1>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  e: LazyArg<E1>
): STM<R, E | E1, B>;
export function filterOrFail_<R, E, A, E1>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  e: LazyArg<E1>
): STM<R, E | E1, A>;
export function filterOrFail_<R, E, A, E1>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  e: LazyArg<E1>
): STM<R, E | E1, A> {
  return self.filterOrElse(f, STM.fail(e));
}

/**
 * Fails with the specified error if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrFail
 */
export function filterOrFail<A, B extends A, E1>(
  f: Refinement<A, B>,
  e: LazyArg<E1>
): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, B>;
export function filterOrFail<A, E1>(f: Predicate<A>, e: LazyArg<E1>): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, A>;
export function filterOrFail<A, E1>(f: Predicate<A>, e: LazyArg<E1>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> => self.filterOrFail(f, e);
}
