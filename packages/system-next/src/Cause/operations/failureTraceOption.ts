// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"
import type { Trace } from "../../Trace"
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
