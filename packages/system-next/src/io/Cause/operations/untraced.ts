import * as Trace from "../../../io/Trace/operations/none"
import type { Cause } from "../definition"

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 *
 * @ets fluent ets/Cause untraced
 */
export function untraced<E>(self: Cause<E>): Cause<E> {
  return self.mapTrace(() => Trace.none)
}
