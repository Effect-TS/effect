// ets_tracing: off

import type * as T from "../../../../Effect"
import * as SK from "../../Sink"
import type * as C from "../core.js"
import * as Run from "./run.js"

/**
 * Runs the stream and collects ignore its elements.
 */
export function runDrain<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, void> {
  return Run.run_(self, SK.drain())
}
