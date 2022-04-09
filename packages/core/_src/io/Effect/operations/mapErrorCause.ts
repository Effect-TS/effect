/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @tsplus fluent ets/Effect mapErrorCause
 */
export function mapErrorCause_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Cause<E2>,
  __tsplusTrace?: string
): Effect<R, E2, A> {
  return self.foldCauseEffect((c) => Effect.failCauseNow(f(c)), Effect.succeedNow);
}

/**
 * Returns an effect with its full cause of failure mapped using the specified
 * function. This can be used to transform errors while preserving the
 * original structure of `Cause`.
 *
 * See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
 * with defects.
 *
 * @tsplus static ets/Effect/Aspects mapErrorCause
 */
export const mapErrorCause = Pipeable(mapErrorCause_);
