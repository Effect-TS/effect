// ets_tracing: off

import type { Cause } from "../definition"
import { squashWith_ } from "./squashWith"

/**
 * Squashes a `Cause` down to a single `Error`, chosen to be the "most
 * important" `Error`.
 */
export function squash_<E>(cause: Cause<E>): Error {
  return squashWith_(cause, (e) => e instanceof Error) as Error
}
