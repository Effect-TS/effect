/**
 * Folds over the `STM` effect, handling both P.failure and success, but not
 * retry.
 *
 * @tsplus fluent ets/STM fold
 */
export function fold_<R, E, A, B, C>(
  self: STM<R, E, A>,
  g: (e: E) => C,
  f: (a: A) => B
): STM<R, never, B | C> {
  return self.foldSTM(
    (e) => STM.succeedNow(g(e)),
    (a) => STM.succeedNow(f(a))
  )
}

/**
 * Folds over the `STM` effect, handling both P.failure and success, but not
 * retry.
 *
 * @tsplus static ets/STM/Aspects fold
 */
export const fold = Pipeable(fold_)
