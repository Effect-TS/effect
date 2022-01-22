import * as V from "../../Collections/Immutable/Vector/core"
import * as O from "../../Option/core"
import type { Cause } from "../definition"
import { isDieType } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(self: Cause<E>): V.Vector<unknown> {
  return V.reverse(
    reduceLeft_(self, V.empty<unknown>(), (causes, cause) =>
      isDieType(cause) ? O.some(V.prepend_(causes, cause.value)) : O.none
    )
  )
}
