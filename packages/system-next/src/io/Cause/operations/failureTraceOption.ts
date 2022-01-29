import * as Tp from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option/core"
import type { Trace } from "../../../io/Trace/definition"
import type { Cause } from "../definition"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 *
 * @ets fluent ets/Cause failureTraceOption
 */
export function failureTraceOption<E>(self: Cause<E>): Option<Tp.Tuple<[E, Trace]>> {
  return self.find((cause) =>
    cause.isFailType() ? Option.some(Tp.tuple(cause.value, cause.trace)) : Option.none
  )
}
