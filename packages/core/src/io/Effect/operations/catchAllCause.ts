/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchAllCause
 * @tsplus pipeable effect/core/io/Effect catchAllCause
 * @category alternatives
 * @since 1.0.0
 */
export function catchAllCause<E, R2, E2, A2>(f: (cause: Cause<E>) => Effect<R2, E2, A2>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E2, A | A2> =>
    self.foldCauseEffect(f, Effect.succeed)
}
