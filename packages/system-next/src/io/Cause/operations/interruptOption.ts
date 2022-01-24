import * as O from "../../../data/Option/core"
import type { FiberId } from "../../FiberId/definition"
import type { Cause } from "../definition"
import { isInterruptType } from "../definition"
import { find_ } from "./find"

/**
 * Returns the `FiberId` associated with the first `Interrupt` in this `Cause`
 * if one exists.
 */
export function interruptOption<E>(self: Cause<E>): O.Option<FiberId> {
  return find_(self, (cause) =>
    isInterruptType(cause) ? O.some(cause.fiberId) : O.none
  )
}
