/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @tsplus fluent ets/Effect unrefineWith
 */
export function unrefineWith_<R, E, E1, E2, A>(
  self: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2,
  __tsplusTrace?: string
) {
  return self.catchAllCause(
    (cause): Effect<R, E1 | E2, A> =>
      cause
        .find((c) => (c.isDieType() ? pf(c.value) : Option.none))
        .fold(Effect.failCauseNow(cause.map(f)), Effect.failNow)
  );
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @tsplus static ets/Effect/Aspects unrefineWith
 */
export const unrefineWith = Pipeable(unrefineWith_);
