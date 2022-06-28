/**
 * "Peeks" at the error of the transactional effect.
 *
 * @tsplus static effect/core/stm/STM.Aspects tapError
 * @tsplus pipeable effect/core/stm/STM tapError
 */
export function tapError<E, R2, E2, X>(f: (e: E) => STM<R2, E2, X>) {
  return <R, A>(self: STM<R, E, A>): STM<R | R2, E | E2, A> =>
    self.foldSTM(
      (e) => f(e) > STM.fail(e),
      STM.succeedNow
    )
}
