import * as Either from "@fp-ts/data/Either"

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter effect/core/stm/STM left
 * @category mutations
 * @since 1.0.0
 */
export function left<R, E, A, B>(
  self: STM<R, E, Either.Either<A, B>>
): STM<R, Either.Either<E, B>, A> {
  return self.foldSTM(
    (e) => STM.fail(Either.left(e)),
    (either) => {
      switch (either._tag) {
        case "Left": {
          return STM.succeed(either.left)
        }
        case "Right": {
          return STM.fail(either)
        }
      }
    }
  )
}
