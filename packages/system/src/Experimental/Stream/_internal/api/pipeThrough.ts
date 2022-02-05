// ets_tracing: off

import type * as SK from "../../Sink/index.js"
import * as C from "../core.js"

/**
 * Pipes all of the values from this stream through the provided sink.
 *
 * @see `transduce`
 */
export function pipeThrough<R, R1, E extends E1, E1, E2, A, L, Z>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A, E2, L, Z>
): C.Stream<R & R1, E2, L> {
  return new C.Stream(self.channel[">>>"](sink.channel))
}
