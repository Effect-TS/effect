import * as Option from "@fp-ts/data/Option"

/**
 * Determines if the `Cause` contains a failure.
 *
 * @tsplus getter effect/core/io/Cause isFailure
 * @category destructors
 * @since 1.0.0
 */
export function isFailure<E>(self: Cause<E>): boolean {
  return Option.isSome(self.failureOption)
}
