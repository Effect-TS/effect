/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 *
 * This method has better performance than `either` since no intermediate
 * value is allocated and does not require subsequent calls to `chain` to
 * define the next effect.
 *
 * The error parameter of the returned `IO` may be chosen arbitrarily, since
 * it will depend on the `IO`s returned by the given continuations.
 *
 * @tsplus static effect/core/io/Effect.Aspects foldEffect
 * @tsplus pipeable effect/core/io/Effect foldEffect
 * @category folding
 * @since 1.0.0
 */
export function foldEffect<E, A, R2, E2, A2, R3, E3, A3>(
  failure: (e: E) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2 | R3, E2 | E3, A2 | A3> =>
    self.foldCauseEffect(
      (cause) => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return failure(either.left)
          }
          case "Right": {
            return Effect.failCause(either.right)
          }
        }
      },
      success
    )
}
