import * as Either from "@fp-ts/data/Either"

/**
 * Converts a `Effect<R, Either<B, E>, A>` into a `Effect<R, E, Either<B, A>>`.
 * The inverse of `right`.
 *
 * @tsplus getter effect/core/io/Effect unright
 * @category getters
 * @since 1.0.0
 */
export function unright<R, B, E, A>(
  self: Effect<R, Either.Either<B, E>, A>
): Effect<R, E, Either.Either<B, A>> {
  return self.foldEffect(
    (either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.succeed(Either.left(either.left))
        }
        case "Right": {
          return Effect.fail(either.right)
        }
      }
    },
    (a) => Effect.succeed(Either.right(a))
  )
}
