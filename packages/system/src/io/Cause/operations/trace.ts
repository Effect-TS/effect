import type { Trace } from "../../../io/Trace/definition"
import { combine_ } from "../../../io/Trace/operations/combine"
import { none } from "../../../io/Trace/operations/none"
import type { Cause } from "../definition"

/**
 * Grabs a complete, linearized trace for the cause.
 *
 * Note: This linearization may be misleading in the presence of parallel
 * errors.
 *
 * @tsplus fluent ets/Cause trace
 */
export function trace<E>(self: Cause<E>): Trace {
  return self.traces().reduce(none, combine_)
}
