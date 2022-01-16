// ets_tracing: off

import type { FiberId } from "../../FiberId"
import * as O from "../../Option"
import type { Cause } from "../definition"
import { find_ } from "./find"

/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
 * if one exists.
 */
export function interruptOption<E>(self: Cause<E>): O.Option<FiberId> {
  return find_(self, (cause) =>
    cause._tag === "Interrupt" ? O.some(cause.fiberId) : O.none
  )
}
