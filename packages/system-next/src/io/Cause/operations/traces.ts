import * as L from "../../../collection/immutable/List/core"
import { Option } from "../../../data/Option/core"
import type { Trace } from "../../../io/Trace/definition"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Grabs a list of execution traces from the cause.
 *
 * @ets fluent ets/Cause traces
 */
export function traces<E>(self: Cause<E>): L.List<Trace> {
  return L.reverse(
    self.foldLeft(L.empty<Trace>(), (acc, curr) => {
      realCause(curr)
      switch (curr._tag) {
        case "Die":
          return Option.some(L.prepend_(acc, curr.trace))
        case "Fail":
          return Option.some(L.prepend_(acc, curr.trace))
        case "Interrupt":
          return Option.some(L.prepend_(acc, curr.trace))
        default:
          return Option.some(acc)
      }
    })
  )
}
