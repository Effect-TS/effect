/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @tsplus static effect/core/io/Effect.Aspects mapErrorCause
 * @tsplus pipeable effect/core/io/Effect mapErrorCause
 */
export function mapErrorCause<E, E2>(f: (cause: Cause<E>) => Cause<E2>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E2, A> =>
    self.foldCauseEffect((c) => Effect.failCause(f(c)), Effect.succeed)
}
