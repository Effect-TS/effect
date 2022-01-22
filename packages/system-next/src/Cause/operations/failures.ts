import * as V from "../../Collections/Immutable/Vector/core"
import * as O from "../../Option/core"
import type { Cause } from "../definition"
import { isFailType } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(self: Cause<E>): V.Vector<E> {
  return reduceLeft_(self, V.empty<E>(), (acc, curr) =>
    isFailType(curr) ? O.some(V.prepend_(acc, curr.value)) : O.some(acc)
  )
}
