// ets_tracing: off

import type * as T from "../../../../Effect"
import * as SK from "../../Sink"
import type * as C from "../core"
import * as Run from "./run"

/**
 * Runs the stream and emits the number of elements processed
 */
export function runCount<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, number> {
  return Run.run_(self, SK.count())
}
