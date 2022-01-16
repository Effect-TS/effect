// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { find_ } from "./find"

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function isInterruptedOnly<E>(self: Cause<E>): boolean {
  return O.getOrElse_(
    find_(self, (cause) =>
      cause._tag === "Die" || cause._tag === "Fail" ? O.some(false) : O.none
    ),
    () => true
  )
}
