/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static effect/core/io/Effect.Ops fail
 * @category constructors
 * @since 1.0.0
 */
export function fail<E>(error: E): Effect<never, E, never> {
  return Effect.failCause(Cause.fail(error))
}
