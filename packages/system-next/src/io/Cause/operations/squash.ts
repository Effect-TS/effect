import type { Cause } from "../definition"

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the "most
 * important" `Error`.
 *
 * @ets fluent ets/Cause squash
 */
export function squash<E>(self: Cause<E>): Error {
  return self.squashWith((e) => e instanceof Error) as Error
}
