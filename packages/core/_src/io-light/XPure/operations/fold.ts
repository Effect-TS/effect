/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @tsplus fluent ets/XPure fold
 */
export function fold_<W, S1, S2, R, E, A, B, C>(
  self: XPure<W, S1, S2, R, E, A>,
  failure: (e: E) => B,
  success: (a: A) => C
): XPure<W, S1 & S2, S1 | S2, R, never, B | C> {
  return self.foldXPure(
    (e) => XPure.succeed(failure(e)),
    (a) => XPure.succeed(success(a))
  );
}

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `fold`.
 *
 * @tsplus static ets/XPure/Aspects fold
 */
export const fold = Pipeable(fold_);
