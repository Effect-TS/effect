// ets_tracing: off

import * as O from "../../Option"
import * as Trace from "../../Trace"
import type { Cause } from "../definition"
import { isDieType, isFailType, isInterruptType } from "../definition"
import { find_ } from "./find"

/**
 * Determines if the `Cause` is traced.
 */
export function isTraced<E>(self: Cause<E>): boolean {
  return O.isSome(
    find_(self, (cause) =>
      (isDieType(cause) && cause.trace !== Trace.none) ||
      (isFailType(cause) && cause.trace !== Trace.none) ||
      (isInterruptType(cause) && cause.trace !== Trace.none)
        ? O.some(undefined)
        : O.none
    )
  )
}
