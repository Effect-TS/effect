/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @tsplus fluent ets/Effect tapDefect
 */
export function tapDefect_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  f: (cause: Cause<never>) => Effect<R2, E2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A> {
  return self.foldCauseEffect(
    (cause) => f(cause.stripFailures()).zipRight(Effect.failCauseNow(cause)),
    Effect.succeedNow
  );
}

/**
 * Returns an effect that effectually "peeks" at the defect of this effect.
 *
 * @tsplus static ets/Effect/Aspects tapDefect
 */
export const tapDefect = Pipeable(tapDefect_);
