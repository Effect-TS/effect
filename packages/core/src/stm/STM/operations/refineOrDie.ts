/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus static effect/core/stm/STM.Aspects refineOrDie
 * @tsplus pipeable effect/core/stm/STM refineOrDie
 */
export function refineOrDie<E, E1>(pf: (e: E) => Maybe<E1>) {
  return <R, A>(self: STM<R, E, A>): STM<R, E1, A> => self.refineOrDieWith(pf, identity)
}
