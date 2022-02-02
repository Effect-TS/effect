// ets_tracing: off

import type * as T from "../../../../Effect"
import * as CH from "../../Channel"
import type * as SK from "../../Sink"
import type * as C from "../core"

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R2, E2, Z>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R2, E, A, E2, unknown, Z>
): T.Effect<R & R2, E2, Z> {
  return CH.runDrain(self.channel[">>>"](sink.channel))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @ets_data_first run_
 */
export function run<E, A, R2, E2, Z>(
  sink: SK.Sink<R2, E, A, E2, unknown, Z>
): <R>(self: C.Stream<R, E, A>) => T.Effect<R & R2, E2, Z> {
  return (self) => run_(self, sink)
}
