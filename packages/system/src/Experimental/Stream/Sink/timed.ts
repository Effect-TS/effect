// ets_tracing: off

import * as CL from "../../../Clock"
import type * as Tp from "../../../Collections/Immutable/Tuple"
import type * as C from "./core"
import * as Summarized from "./summarized"

/**
 * Returns the sink that executes this one and times its execution.
 */
export function timed<R, InErr, In, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
): C.Sink<CL.HasClock & R, InErr, In, OutErr, L, Tp.Tuple<[Z, number]>> {
  return Summarized.summarized_(self, CL.currentTime, (start, end) => end - start)
}
