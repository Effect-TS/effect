import * as Either from "@fp-ts/data/Either"

/**
 * "Zooms in" on the value in the `Left` side of an `Either`, moving the
 * possibility that the value is a `Right` to the error channel.
 *
 * @tsplus getter effect/core/io/Effect left
 * @category getters
 * @since 1.0.0
 */
export function left<R, E, A, B>(
  self: Effect<R, E, Either.Either<A, B>>
): Effect<R, Either.Either<E, B>, A> {
  return self.foldEffect(
    (e) => Effect.fail(Either.left(e)),
    (either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.succeed(either.left)
        }
        case "Right": {
          return Effect.fail(Either.right(either.right))
        }
      }
    }
  )
}
