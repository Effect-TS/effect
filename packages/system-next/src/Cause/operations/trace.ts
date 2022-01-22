import * as L from "../../Collections/Immutable/Vector/core"
import type { Trace } from "../../Trace/definition"
import { combine_ } from "../../Trace/operations/combine"
import { none } from "../../Trace/operations/none"
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
