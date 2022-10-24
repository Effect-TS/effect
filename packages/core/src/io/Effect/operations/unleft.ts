import * as Either from "@fp-ts/data/Either"

/**
 * Converts a `Effect<R, Either<E, B>, A>` into a `Effect<R, E, Either<A, B>>`.
 * The inverse of `left`.
 *
 * @tsplus getter effect/core/io/Effect unleft
 * @category getters
 * @since 1.0.0
 */
export function unleft<R, E, B, A>(
  self: Effect<R, Either.Either<E, B>, A>
): Effect<R, E, Either.Either<A, B>> {
  return self.foldEffect(
    (either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.fail(either.left)
        }
        case "Right": {
          return Effect.succeed(Either.right(either.right))
        }
      }
    },
    (a) => Effect.succeed(Either.left(a))
  )
}
