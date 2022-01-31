import type { Cause } from "../definition"

/**
 * Determines if the `Cause` contains a failure.
 *
 * @ets fluent ets/Cause isFailure
 */
export function isFailure<E>(self: Cause<E>): boolean {
  return self.failureOption().isSome()
}
