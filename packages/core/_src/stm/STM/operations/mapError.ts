/**
 * Maps from one error type to another.
 *
 * @tsplus static effect/core/stm/STM.Aspects mapError
 * @tsplus pipeable effect/core/stm/STM mapError
 */
export function mapError<E, E1>(f: (a: E) => E1) {
  return <R, A>(self: STM<R, E, A>): STM<R, E1, A> =>
    self.foldSTM(
      (e) => STM.fail(f(e)),
      STM.succeed
    )
}
