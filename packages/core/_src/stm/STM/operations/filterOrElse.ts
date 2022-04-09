/**
 * Supplies `orElse` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrElse
 */
export function filterOrElse_<R, E, A, B extends A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  orElse: LazyArg<STM<R2, E2, A2>>
): STM<R & R2, E | E2, B | A2>;
export function filterOrElse_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
): STM<R & R2, E | E2, A | A2>;
export function filterOrElse_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
): STM<R & R2, E | E2, A | A2> {
  return self.filterOrElseWith(f, orElse);
}

/**
 * Supplies `orElse` if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrElse
 */
export function filterOrElse<A, B extends A, R2, E2, A2>(
  f: Refinement<A, B>,
  orElse: LazyArg<STM<R2, E2, A2>>
): <R, E>(self: STM<R, E, A>) => STM<R & R2, E | E2, B | A2>;
export function filterOrElse<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
): <R, E>(self: STM<R, E, A>) => STM<R & R2, E | E2, A | A2>;
export function filterOrElse<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: LazyArg<STM<R2, E2, A2>>
) {
  return <R, E>(self: STM<R, E, A>): STM<R & R2, E | E2, A | A2> => self.filterOrElse(f, orElse);
}
