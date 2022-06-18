/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @tsplus fluent ets/Effect fold
 */
export function fold_<R, E, A, A2, A3>(
  self: Effect<R, E, A>,
  failure: (e: E) => A2,
  success: (a: A) => A3,
  __tsplusTrace?: string
): Effect<R, never, A2 | A3> {
  return self.foldEffect(
    (e) => Effect.succeedNow(failure(e)),
    (a) => Effect.succeedNow(success(a))
  )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @tsplus static ets/Effect/Aspects fold
 */
export const fold = Pipeable(fold_)
