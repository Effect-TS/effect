/**
 * Returns an effect that models failure with the specified error. The moral
 * equivalent of `throw` for pure code.
 *
 * @tsplus static ets/Effect/Ops fail
 */
export function fail<E>(error: LazyArg<E>, __tsplusTrace?: string): IO<E, never> {
  return Effect.failCause(Cause.fail(error(), Trace.none));
}
