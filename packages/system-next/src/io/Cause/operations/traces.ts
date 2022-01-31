import { List } from "../../../collection/immutable/List"
import { Option } from "../../../data/Option/core"
import type { Trace } from "../../../io/Trace/definition"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Grabs a list of execution traces from the cause.
 *
 * @tsplus fluent ets/Cause traces
 */
export function traces<E>(self: Cause<E>): List<Trace> {
  return self
    .foldLeft(List.empty<Trace>(), (acc, curr) => {
      realCause(curr)
      switch (curr._tag) {
        case "Die":
          return Option.some(acc.prepend(curr.trace))
        case "Fail":
          return Option.some(acc.prepend(curr.trace))
        case "Interrupt":
          return Option.some(acc.prepend(curr.trace))
        default:
          return Option.some(acc)
      }
    })
    .reverse()
}
