/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static effect/core/io/Effect.Ops failSync
 */
export function failSync<E>(error: LazyArg<E>, __tsplusTrace?: string): Effect<never, E, never> {
  return Effect.failCauseSync(Cause.fail(error(), Trace.none))
}
