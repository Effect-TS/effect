import * as Either from "@fp-ts/data/Either"

/**
 * "Zooms in" on the value in the `Right` side of an `Either`, moving the
 * possibility that the value is a `Left` to the error channel.
 *
 * @tsplus getter effect/core/io/Effect right
 * @category getters
 * @since 1.0.0
 */
export function right<R, E, A, B>(
  self: Effect<R, E, Either.Either<A, B>>
): Effect<R, Either.Either<A, E>, B> {
  return self.foldEffect(
    (e) => Effect.fail(Either.right(e)),
    (either) => {
      switch (either._tag) {
        case "Left": {
          return Effect.fail(Either.left(either.left))
        }
        case "Right": {
          return Effect.succeed(either.right)
        }
      }
    }
  )
}
