/**
 * Fails with `failWith` if the predicate fails.
 *
 * @tsplus fluent ets/STM filterOrFailWith
 */
export function filterOrFailWith_<R, E, E1, A, B extends A>(
  self: STM<R, E, A>,
  f: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): STM<R, E | E1, B>
export function filterOrFailWith_<R, E, E1, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  failWith: (a: A) => E1
): STM<R, E | E1, A>
export function filterOrFailWith_<R, E, E1, A>(
  self: STM<R, E, A>,
  f: Predicate<A>,
  failWith: unknown
) {
  return self.filterOrElseWith(f, (x) => STM.fail((failWith as (a: A) => E1)(x)))
}

/**
 * Fails with `failWith` if the predicate fails.
 *
 * @tsplus static ets/STM/Aspects filterOrFailWith
 */
export function filterOrFailWith<A, B extends A, E1>(
  f: Refinement<A, B>,
  failWith: (a: Exclude<A, B>) => E1
): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, B>
export function filterOrFailWith<A, E1>(
  f: Predicate<A>,
  failWith: (a: A) => E1
): <R, E>(self: STM<R, E, A>) => STM<R, E | E1, A>
export function filterOrFailWith<A, E1>(f: Predicate<A>, failWith: unknown) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> => self.filterOrFailWith(f, failWith as (a: A) => E1)
}
