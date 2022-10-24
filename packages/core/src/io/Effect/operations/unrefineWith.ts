import * as Option from "@fp-ts/data/Option"

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @tsplus static effect/core/io/Effect.Aspects unrefineWith
 * @tsplus pipeable effect/core/io/Effect unrefineWith
 * @category mutations
 * @since 1.0.0
 */
export function unrefineWith<E, E1, E2>(
  pf: (u: unknown) => Option.Option<E1>,
  f: (e: E) => E2
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1 | E2, A> =>
    self.catchAllCause(
      (cause): Effect<R, E1 | E2, A> => {
        const option = cause.find((c) => (c.isDieType() ? pf(c.value) : Option.none))
        switch (option._tag) {
          case "None": {
            return Effect.failCause(cause.map(f))
          }
          case "Some": {
            return Effect.fail(option.value)
          }
        }
      }
    )
}
