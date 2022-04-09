/**
 * Folds over the value or cause.
 *
 * @tsplus fluent ets/Exit fold
 */
export function fold_<E, A, Z>(
  self: Exit<E, A>,
  failed: (cause: Cause<E>) => Z,
  completed: (a: A) => Z
): Z {
  switch (self._tag) {
    case "Failure":
      return failed(self.cause);
    case "Success":
      return completed(self.value);
  }
}

/**
 * Folds over the value or cause.
 *
 * @tsplus static ets/Exit/Aspects fold
 */
export const fold = Pipeable(fold_);
