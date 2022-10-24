import * as Either from "@fp-ts/data/Either"
/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @tsplus getter effect/core/stm/STM right
 * @category getters
 * @since 1.0.0
 */
export function right<R, E, A, B>(
  self: STM<R, E, Either.Either<A, B>>
): STM<R, Either.Either<A, E>, B> {
  return self.foldSTM(
    (e) => STM.fail(Either.right(e)),
    (either) => {
      switch (either._tag) {
        case "Left": {
          return STM.fail(either)
        }
        case "Right": {
          return STM.succeed(either.right)
        }
      }
    }
  )
}
