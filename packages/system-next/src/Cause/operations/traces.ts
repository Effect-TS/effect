import * as V from "../../Collections/Immutable/Vector/core"
import * as O from "../../Option/core"
import type { Trace } from "../../Trace/definition"
import type { Cause } from "../definition"
import { realCause } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Grabs a list of execution traces from the cause.
 */
export function traces<E>(self: Cause<E>): V.Vector<Trace> {
  return V.reverse(
    reduceLeft_(self, V.empty<Trace>(), (acc, curr) => {
      realCause(curr)
      switch (curr._tag) {
        case "Die":
          return O.some(V.prepend_(acc, curr.trace))
        case "Fail":
          return O.some(V.prepend_(acc, curr.trace))
        case "Interrupt":
          return O.some(V.prepend_(acc, curr.trace))
        default:
          return O.some(acc)
      }
    })
  )
}
