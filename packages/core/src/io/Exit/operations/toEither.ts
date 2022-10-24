import * as Either from "@fp-ts/data/Either"

/**
 * Converts the `Exit` to an `Either<FiberFailure<E>, A>`, by wrapping the
 * cause in `FiberFailure` (if the result is failed).
 *
 * @tsplus getter effect/core/io/Exit toEither
 * @category conversions
 * @since 1.0.0
 */
export function toEither<E, A>(self: Exit<E, A>): Either.Either<FiberFailure<E>, A> {
  switch (self._tag) {
    case "Failure":
      return Either.left(new FiberFailure(self.cause))
    case "Success":
      return Either.right(self.value)
  }
}
