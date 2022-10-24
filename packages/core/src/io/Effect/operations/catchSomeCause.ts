import type { Option } from "@fp-ts/data/Option"

/**
 * Recovers from some or all of the error cases with provided cause.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSomeCause
 * @tsplus pipeable effect/core/io/Effect catchSomeCause
 * @category alternatives
 * @since 1.0.0
 */
export function catchSomeCause<E, R2, E2, A2>(
  f: (cause: Cause<E>) => Option<Effect<R2, E2, A2>>
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldCauseEffect(
      (cause): Effect<R2, E | E2, A2> => {
        const option = f(cause)
        switch (option._tag) {
          case "None": {
            return Effect.failCause(cause)
          }
          case "Some": {
            return option.value
          }
        }
      },
      Effect.succeed
    )
}
