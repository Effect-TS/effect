/**
 * Sequentially zips the this result with the specified result or else returns
 * the failed `Cause<E>`.
 *
 * @tsplus static effect/core/io/Exit.Aspects foldEffect
 * @tsplus pipeable effect/core/io/Exit foldEffect
 * @category folding
 * @since 1.0.0
 */
export function foldEffect<E, A, R1, E1, A1, R2, E2, A2>(
  failed: (cause: Cause<E>) => Effect<R1, E1, A1>,
  completed: (a: A) => Effect<R2, E2, A2>
) {
  return (self: Exit<E, A>): Effect<R1 | R2, E1 | E2, A1 | A2> => {
    switch (self._tag) {
      case "Failure":
        return failed(self.cause)
      case "Success":
        return completed(self.value)
    }
  }
}
