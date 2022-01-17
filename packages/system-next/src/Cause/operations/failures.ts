// ets_tracing: off

import * as L from "../../Collections/Immutable/List"
import * as O from "../../Option"
import { isFailType } from ".."
import type { Cause } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(self: Cause<E>): L.List<E> {
  return reduceLeft_(self, L.empty<E>(), (acc, curr) =>
    isFailType(curr) ? O.some(L.prepend_(acc, curr.value)) : O.some(acc)
  )
}
