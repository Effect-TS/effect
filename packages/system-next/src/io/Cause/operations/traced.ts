import type { Trace } from "../../../io/Trace/definition"
import { combine } from "../../../io/Trace/operations/combine"
import type { Cause } from "../definition"
import { mapTrace_ } from "./mapTrace"

/**
 * Adds the specified execution trace to traces.
 *
 * @ets fluent ets/Cause traced
 */
export function traced_<E>(self: Cause<E>, trace: Trace): Cause<E> {
  return mapTrace_(self, combine(trace))
}

/**
 * Adds the specified execution trace to traces.
 *
 * @ets_data_first traced_
 */
export function traced(trace: Trace) {
  return <E>(self: Cause<E>): Cause<E> => traced_(self, trace)
}
