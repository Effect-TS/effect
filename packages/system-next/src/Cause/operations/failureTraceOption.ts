import * as Tp from "../../Collections/Immutable/Tuple/core"
import * as O from "../../Option/core"
import type { Trace } from "../../Trace/definition"
import type { Cause } from "../definition"
import { isFailType } from "../definition"
import { find_ } from "./find"

/**
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists, along with its (optional) trace.
 */
export function failureTraceOption<E>(self: Cause<E>): O.Option<Tp.Tuple<[E, Trace]>> {
  return find_(self, (cause) =>
    isFailType(cause) ? O.some(Tp.tuple(cause.value, cause.trace)) : O.none
  )
}
