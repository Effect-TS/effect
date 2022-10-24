import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"

/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static effect/core/io/Effect.Aspects catchSome
 * @tsplus pipeable effect/core/io/Effect catchSome
 * @category alternatives
 * @since 1.0.0
 */
export function catchSome<E, R2, E2, A2>(f: (e: E) => Option.Option<Effect<R2, E2, A2>>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A | A2> =>
    self.foldCauseEffect(
      (cause): Effect<R2, E | E2, A2> => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return pipe(f(either.left), Option.getOrElse(Effect.failCause(cause)))
          }
          case "Right": {
            return Effect.failCause(either.right)
          }
        }
      },
      Effect.succeed
    )
}
