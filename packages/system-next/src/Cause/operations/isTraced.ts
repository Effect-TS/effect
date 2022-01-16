// ets_tracing: off

import * as O from "../../Option"
import * as Trace from "../../Trace"
import type { Cause } from "../definition"
import { find_ } from "./find"

/**
 * Determines if the `Cause` is traced.
 */
export function isTraced<E>(self: Cause<E>): boolean {
  return O.isSome(
    find_(self, (cause) =>
      (cause._tag === "Die" && cause.trace !== Trace.none) ||
      (cause._tag === "Fail" && cause.trace !== Trace.none) ||
      (cause._tag === "Interrupt" && cause.trace !== Trace.none)
        ? O.some(undefined)
        : O.none
    )
  )
}
