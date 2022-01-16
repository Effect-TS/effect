// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { dieOption } from "./dieOption"

/**
 * Determines if the `Cause` contains a die.
 */
export function isDie<E>(self: Cause<E>): boolean {
  return O.isSome(dieOption(self))
}
