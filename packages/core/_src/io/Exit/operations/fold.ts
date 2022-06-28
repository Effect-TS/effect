/**
 * Folds over the value or cause.
 *
 * @tsplus static effect/core/io/Exit.Aspects fold
 * @tsplus pipeable effect/core/io/Exit fold
 */
export function fold<E, A, Z>(
  failed: (cause: Cause<E>) => Z,
  completed: (a: A) => Z
) {
  return (self: Exit<E, A>): Z => {
    switch (self._tag) {
      case "Failure":
        return failed(self.cause)
      case "Success":
        return completed(self.value)
    }
  }
}
