/**
 * Effectfully folds over the `STM` effect, handling both failure and
 * success.
 *
 * @tsplus static effect/core/stm/STM.Aspects foldSTM
 * @tsplus pipeable effect/core/stm/STM foldSTM
 */
export function foldSTM<E, R1, E1, A1, A, R2, E2, A2>(
  g: (e: E) => STM<R1, E1, A1>,
  f: (a: A) => STM<R2, E2, A2>
) {
  return <R>(self: STM<R, E, A>): STM<R | R1 | R2, E1 | E2, A1 | A2> =>
    self
      .map(Either.right)
      .catchAll((e) => g(e).map(Either.left))
      .flatMap((either) => either.fold(STM.succeed, f))
}
