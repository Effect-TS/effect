// ets_tracing: off

import type { Trace } from "../../Trace"
import { combine } from "../../Trace"
import type { Cause } from "../definition"
import { mapTrace_ } from "./mapTrace"

/**
 * Adds the specified execution trace to traces.
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
