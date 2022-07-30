/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @tsplus static effect/core/io/Effect.Aspects mapError
 * @tsplus pipeable effect/core/io/Effect mapError
 */
export function mapError<E, E2>(f: (e: E) => E2, __tsplusTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    self.foldCauseEffect(
      (cause) => cause.failureOrCause.fold((e) => Effect.fail(f(e)), Effect.failCause),
      Effect.succeed
    )
}
