// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { isDieType, isFailType } from "../definition"
import { find_ } from "./find"

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function isInterruptedOnly<E>(self: Cause<E>): boolean {
  return O.getOrElse_(
    find_(self, (cause) =>
      isDieType(cause) || isFailType(cause) ? O.some(false) : O.none
    ),
    () => true
  )
}
