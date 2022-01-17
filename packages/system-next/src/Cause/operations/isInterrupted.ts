// ets_tracing: off

import * as O from "../../Option/core"
import type { Cause } from "../definition"
import { isInterruptType } from "../definition"
import { find_ } from "./find"

/**
 * Determines if the `Cause` contains an interruption.
 */
export function isInterrupted<E>(self: Cause<E>): boolean {
  return O.isSome(
    find_(self, (cause) => (isInterruptType(cause) ? O.some(undefined) : O.none))
  )
}
