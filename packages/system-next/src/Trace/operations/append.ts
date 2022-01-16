// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk"
import * as FiberId from "../../FiberId"
import { Trace } from "../definition"

/**
 * Combine two `Trace`s.
 */
export function combine_(self: Trace, that: Trace): Trace {
  return new Trace(
    FiberId.combine_(self.fiberId, that.fiberId),
    Chunk.concat_(self.stackTrace, that.stackTrace)
  )
}

/**
 * Combine two `Trace`s.
 *
 * @ets_data_first combine_
 */
export function combine(that: Trace) {
  return (self: Trace): Trace => combine_(self, that)
}
