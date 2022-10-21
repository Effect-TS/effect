/**
 * Determines if the `Cause` contains a failure.
 *
 * @tsplus getter effect/core/io/Cause isFailure
 */
export function isFailure<E>(self: Cause<E>): boolean {
  return self.failureMaybe.isSome()
}
