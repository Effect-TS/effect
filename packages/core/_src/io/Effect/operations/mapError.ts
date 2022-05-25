/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @tsplus fluent ets/Effect mapError
 */
export function mapError_<R, E, A, E2>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  __tsplusTrace?: string
): Effect<R, E2, A> {
  return self.foldCauseEffect(
    (cause) => cause.failureOrCause().fold((e) => Effect.failNow(f(e)), Effect.failCauseNow),
    Effect.succeedNow
  )
}

/**
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger" error.
 *
 * @tsplus static ets/Effect/Aspects mapError
 */
export const mapError = Pipeable(mapError_)
