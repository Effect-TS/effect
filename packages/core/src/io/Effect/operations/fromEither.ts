import type { Either } from "@fp-ts/data/Either"

/**
 * Lifts an `Either` into an `Effect` value.
 *
 * @tsplus static effect/core/io/Effect.Ops fromEither
 * @category conversions
 * @since 1.0.0
 */
export function fromEither<E, A>(either: Either<E, A>): Effect<never, E, A> {
  switch (either._tag) {
    case "Left": {
      return Effect.fail(either.left)
    }
    case "Right": {
      return Effect.succeed(either.right)
    }
  }
}
