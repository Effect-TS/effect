/**
 * Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.
 *
 * @tsplus static effect/core/stm/STM.Ops ifSTM
 */
export function ifSTM<R, R1, R2, E, E1, E2, A, A1>(
  b: LazyArg<STM<R, E, boolean>>,
  onTrue: LazyArg<STM<R1, E1, A>>,
  onFalse: LazyArg<STM<R2, E2, A1>>
): STM<R | R1 | R2, E | E1 | E2, A | A1> {
  return STM.suspend(
    b().flatMap(
      (b): STM<R | R1 | R2, E | E1 | E2, A | A1> => (b ? onTrue() : onFalse())
    )
  )
}
