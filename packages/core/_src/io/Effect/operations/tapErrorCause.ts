/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @tsplus fluent ets/Effect tapErrorCause
 */
export function tapErrorCause_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (cause: Cause<E>) => Effect<R2, E2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) => f(cause).zipRight(Effect.failCauseNow(cause)),
    Effect.succeedNow
  );
}

/**
 * Returns an effect that effectually "peeks" at the cause of the failure of
 * this effect.
 *
 * @tsplus static ets/Effect/Aspects tapErrorCause
 */
export const tapErrorCause = Pipeable(tapErrorCause_);
