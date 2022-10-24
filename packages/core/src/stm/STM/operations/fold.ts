/**
 * Folds over the `STM` effect, handling both P.failure and success, but not
 * retry.
 *
 * @tsplus static effect/core/stm/STM.Aspects fold
 * @tsplus pipeable effect/core/stm/STM fold
 * @category folding
 * @since 1.0.0
 */
export function fold<E, C, A, B>(g: (e: E) => C, f: (a: A) => B) {
  return <R>(self: STM<R, E, A>): STM<R, never, B | C> =>
    self.foldSTM(
      (e) => STM.sync(g(e)),
      (a) => STM.sync(f(a))
    )
}
