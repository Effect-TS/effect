/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @tsplus fluent ets/Effect catchAllCause
 */
export function catchAllCause_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R | R2, E2, A | A2> {
  return self.foldCauseEffect(f, Effect.succeedNow)
}

/**
 * Recovers from all errors with provided `Cause`.
 *
 * See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
 * recover from defects.
 *
 * @tsplus static ets/Effect/Aspects catchAllCause
 */
export const catchAllCause = Pipeable(catchAllCause_)
