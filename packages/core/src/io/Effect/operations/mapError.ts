/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @tsplus static effect/core/io/Effect.Aspects mapError
 * @tsplus pipeable effect/core/io/Effect mapError
 * @category mapping
 * @since 1.0.0
 */
export function mapError<E, E2>(f: (e: E) => E2) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    self.foldCauseEffect(
      (cause) => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return Effect.failSync(f(either.left))
          }
          case "Right": {
            return Effect.failCause(either.right)
          }
        }
      },
      Effect.succeed
    )
}
