/**
 * Converts the `Exit` to an `Either<FiberFailure<E>, A>`, by wrapping the
 * cause in `FiberFailure` (if the result is failed).
 *
 * @tsplus fluent ets/Exit toEither
 */
export function toEither<E, A>(self: Exit<E, A>): Either<FiberFailure<E>, A> {
  switch (self._tag) {
    case "Failure":
      return Either.left(new FiberFailure(self.cause))
    case "Success":
      return Either.right(self.value)
  }
}
