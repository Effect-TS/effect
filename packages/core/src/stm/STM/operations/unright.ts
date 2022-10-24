import * as Either from "@fp-ts/data/Either"

/**
 * Converts a `STM<R, Either<B, E>, A>` into a `STM<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @tsplus getter effect/core/stm/STM unright
 * @category getters
 * @since 1.0.0
 */
export function unright<R, B, E, A>(
  self: STM<R, Either.Either<B, E>, A>
): STM<R, E, Either.Either<B, A>> {
  return self.foldSTM(
    (either) => {
      switch (either._tag) {
        case "Left": {
          return STM.succeed(either)
        }
        case "Right": {
          return STM.fail(either.right)
        }
      }
    },
    (a) => STM.succeed(Either.right(a))
  )
}
