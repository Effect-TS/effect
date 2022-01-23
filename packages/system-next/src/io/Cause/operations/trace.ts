import * as L from "../../../collection/immutable/List/core"
import type { Trace } from "../../../io/Trace/definition"
import { combine_ } from "../../../io/Trace/operations/combine"
import { none } from "../../../io/Trace/operations/none"
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
