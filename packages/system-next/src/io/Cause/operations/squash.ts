import type { Cause } from "../definition"

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the "most
 * important" `Error`.
 *
 * @ets fluent ets/Cause squash
 */
export function squash_<E>(cause: Cause<E>): Error {
  return cause.squashWith((e) => e instanceof Error) as Error
}
