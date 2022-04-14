/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static ets/Effect/Ops failNow
 */
export function failNow<E>(error: E, __tsplusTrace?: string): Effect.IO<E, never> {
  return Effect.failCauseNow(Cause.fail(error, Trace.none));
}
