/**
 * Fails with `failWith` if the predicate fails.
 *
 * @tsplus static effect/core/stm/STM.Aspects filterOrFailWith
 * @tsplus pipeable effect/core/stm/STM filterOrFailWith
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
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> =>
    self.filterOrElseWith(f, (x) => STM.fail((failWith as (a: A) => E1)(x)))
}
