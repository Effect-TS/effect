/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static effect/core/io/Effect.Ops failNow
 */
export function failNow<E>(error: E, __tsplusTrace?: string): Effect<never, E, never> {
  return Effect.failCauseNow(Cause.fail(error, Trace.none))
}
