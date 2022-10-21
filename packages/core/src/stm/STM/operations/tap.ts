/**
 * "Peeks" at the success of transactional effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects tap
 * @tsplus pipeable effect/core/stm/STM tap
 */
export function tap<A, R2, E2, X>(f: (a: A) => STM<R2, E2, X>) {
  return <R, E>(self: STM<R, E, A>): STM<R | R2, E | E2, A> =>
    self.flatMap((a: A) => f(a).map(() => a))
}
