import * as Either from "@fp-ts/data/Either"

/**
 * Retrieve the first checked error on the `Left` if available, if there are
 * no checked errors return the rest of the `Cause` that is known to contain
 * only `Die` or `Interrupt` causes.
 *
 * @tsplus getter effect/core/io/Cause failureOrCause
 * @category destructors
 * @since 1.0.0
 */
export function failureOrCause<E>(self: Cause<E>): Either.Either<E, Cause<never>> {
  const option = self.failureOption
  switch (option._tag) {
    case "None": {
      return Either.right(self as Cause<never>) // no E inside this cause, can safely cast
    }
    case "Some": {
      return Either.left(option.value)
    }
  }
}
