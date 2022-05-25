/**
 * Applies `orElse` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrElseWith
 */
export function filterOrElseWith_<R, E, A, B extends A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  orElse: (a: A) => STM<R2, E2, A2>
): STM<R & R2, E | E2, B | A2>
export function filterOrElseWith_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  orElse: (a: A) => STM<R2, E2, A2>
): STM<R & R2, E | E2, A | A2>
export function filterOrElseWith_<R, E, A, R2, E2, A2>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  orElse: (a: A) => STM<R2, E2, A2>
): STM<R & R2, E | E2, A | A2> {
  return self.flatMap(
    (a): STM<R2, E2, A | A2> => f(a) ? STM.succeedNow(a) : STM.suspend((orElse as (a: A) => STM<R2, E2, A2>)(a))
  )
}

/**
 * Applies `orElse` if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrElseWith
 */
export function filterOrElseWith<A, B extends A, R2, E2, A2>(
  f: Refinement<A, B>,
  orElse: (a: A) => STM<R2, E2, A2>
): <R, E>(self: STM<R, E, A>) => STM<R & R2, E | E2, B | A2>
export function filterOrElseWith<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: (a: A) => STM<R2, E2, A2>
): <R, E>(self: STM<R, E, A>) => STM<R & R2, E | E2, A | A2>
export function filterOrElseWith<A, R2, E2, A2>(
  f: Predicate<A>,
  orElse: (a: A) => STM<R2, E2, A2>
) {
  return <R, E>(self: STM<R, E, A>): STM<R & R2, E | E2, A | A2> =>
    self.filterOrElseWith(f, orElse as (a: A) => STM<R2, E2, A2>)
}
