/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus fluent ets/Effect catchSome
 */
export function catchSome_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (e: E) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return self.foldCauseEffect(
    (cause): Effect<R2, E | E2, A2> =>
      cause
        .failureOrCause()
        .fold((x) => f(x).getOrElse(Effect.failCauseNow(cause)), Effect.failCauseNow),
    Effect.succeedNow
  );
}

/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static ets/Effect/Aspects catchSome
 */
export const catchSome = Pipeable(catchSome_);
