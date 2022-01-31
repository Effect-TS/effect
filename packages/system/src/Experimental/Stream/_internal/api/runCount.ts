// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as Run from "./run.js"

/**
 * Runs the stream and emits the number of elements processed
 */
export function runCount<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, number> {
  return Run.run_(self, SK.count())
}
