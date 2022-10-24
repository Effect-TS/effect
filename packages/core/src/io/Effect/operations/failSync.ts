/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static effect/core/io/Effect.Ops failSync
 * @category constructors
 * @since 1.0.0
 */
export function failSync<E>(error: LazyArg<E>): Effect<never, E, never> {
  return Effect.failCauseSync(Cause.fail(error()))
}
