// ets_tracing: off

import { pipe } from "../../../../Function/index.js"
import type * as M from "../../../../Managed/index.js"
import * as CH from "../../Channel/index.js"
import type * as SK from "../../Sink/index.js"
import type * as C from "../core.js"

export function runManaged_<R, R1, E, A, E2, B, L>(
  self: C.Stream<R, E, A>,
  sink: SK.Sink<R1, E, A, E2, L, B>
): M.Managed<R & R1, E2, B> {
  return pipe(CH.pipeTo_(self.channel, sink.channel), CH.drain, CH.runManaged)
}

/**
 * @ets_data_first runManaged_
 */
export function runManaged<R1, E, A, E2, B>(sink: SK.Sink<R1, E, A, E2, any, B>) {
  return <R>(self: C.Stream<R, E, A>) => runManaged_(self, sink)
}
