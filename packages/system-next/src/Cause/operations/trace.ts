// ets_tracing: off

import * as L from "../../Collections/Immutable/List"
import type { Trace } from "../../Trace"
import { combine_, none } from "../../Trace"
import type { Cause } from "../definition"
import { traces } from "./traces"

/**
 * Grabs a complete, linearized trace for the cause.
 *
 * Note: This linearization may be misleading in the presence of parallel
 * errors.
 */
export function trace<E>(self: Cause<E>): Trace {
  return L.reduce_(traces(self), none, combine_)
}
