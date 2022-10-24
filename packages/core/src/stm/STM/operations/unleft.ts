import * as Either from "@fp-ts/data/Either"

/**
 * Converts a `STM<R, Either<E, B>, A>` into a `STM<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus getter effect/core/stm/STM unleft
 * @category getters
 * @since 1.0.0
 */
export function unleft<R, E, B, A>(
  self: STM<R, Either.Either<E, B>, A>
): STM<R, E, Either.Either<A, B>> {
  return self.foldSTM(
    (either) => {
      switch (either._tag) {
        case "Left": {
          return STM.fail(either.left)
        }
        case "Right": {
          return STM.succeed(either)
        }
      }
    },
    (a) => STM.succeed(Either.left(a))
  )
}
