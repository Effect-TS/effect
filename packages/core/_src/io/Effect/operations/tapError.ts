/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @tsplus fluent ets/Effect tapError
 */
export function tapError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (e: E) => Effect<R2, E2, X>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) =>
      cause.failureOrCause().fold(
        (e) => f(e).zipRight(Effect.failCauseNow(cause)),
        () => Effect.failCauseNow(cause)
      ),
    Effect.succeedNow
  )
}

/**
 * Returns an effect that effectfully "peeks" at the failure of this effect.
 *
 * @tsplus static ets/Effect/Aspects tapError
 */
export const tapError = Pipeable(tapError_)
