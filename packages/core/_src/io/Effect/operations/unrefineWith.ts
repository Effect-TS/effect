/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @tsplus static effect/core/io/Effect.Aspects unrefineWith
 * @tsplus pipeable effect/core/io/Effect unrefineWith
 */
export function unrefineWith<E, E1, E2>(
  pf: (u: unknown) => Maybe<E1>,
  f: (e: E) => E2,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1 | E2, A> =>
    self.catchAllCause(
      (cause): Effect<R, E1 | E2, A> =>
        cause
          .find((c) => (c.isDieType() ? pf(c.value) : Maybe.none))
          .fold(Effect.failCause(cause.map(f)), Effect.fail)
    )
}
