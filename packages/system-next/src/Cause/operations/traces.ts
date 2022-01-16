// ets_tracing: off

import * as L from "../../Collections/Immutable/List"
import * as O from "../../Option"
import type { Trace } from "../../Trace"
import type { Cause } from "../definition"
import { reduceLeft_ } from "./reduceLeft"

/**
 * Grabs a list of execution traces from the cause.
 */
export function traces<E>(self: Cause<E>): L.List<Trace> {
  return L.reverse(
    reduceLeft_(self, L.empty<Trace>(), (acc, curr) => {
      switch (curr._tag) {
        case "Die":
          return O.some(L.prepend_(acc, curr.trace))
        case "Fail":
          return O.some(L.prepend_(acc, curr.trace))
        case "Interrupt":
          return O.some(L.prepend_(acc, curr.trace))
        default:
          return O.some(acc)
      }
    })
  )
}
