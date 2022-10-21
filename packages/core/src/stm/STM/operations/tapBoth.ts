/**
 * "Peeks" at both sides of an transactional effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects tapBoth
 * @tsplus pipeable effect/core/stm/STM tapBoth
 */
export function tapBoth<E, R2, E2, X, A, R3, E3, X1>(
  f: (e: E) => STM<R2, E2, X>,
  g: (a: A) => STM<R3, E3, X1>
) {
  return <R>(self: STM<R, E, A>): STM<R | R2 | R3, E | E2 | E3, A> =>
    self.foldSTM(
      (e) => f(e) > STM.fail(e),
      (a) => g(a).as(a)
    )
}
