// ets_tracing: off

import * as L from "../../Collections/Immutable/List"
import * as O from "../../Option"
import type { Cause } from "../definition"
import { isDieType } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(self: Cause<E>): L.List<unknown> {
  return L.reverse(
    reduceLeft_(self, L.empty<unknown>(), (causes, cause) =>
      isDieType(cause) ? O.some(L.prepend_(causes, cause.value)) : O.none
    )
  )
}
