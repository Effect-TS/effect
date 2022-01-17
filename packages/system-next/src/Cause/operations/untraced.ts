import { none } from "../../Trace/operations/none"
import type { Cause } from "../definition"
import { mapTrace_ } from "./mapTrace"

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untraced<E>(self: Cause<E>): Cause<E> {
  return mapTrace_(self, () => none)
}
