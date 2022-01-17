// ets_tracing: off

import * as O from "../../Option"
import type { Cause } from "../definition"
import { isDieType } from "../definition"
import { find_ } from "./find"

/**
 * Returns the value associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(self: Cause<E>): O.Option<unknown> {
  return find_(self, (cause) => (isDieType(cause) ? O.some(cause.value) : O.none))
}
