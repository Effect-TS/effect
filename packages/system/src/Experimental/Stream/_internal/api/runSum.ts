// ets_tracing: off

import type * as T from "../../../../Effect"
import * as SK from "../../Sink"
import type * as C from "../core.js"
import * as Run from "./run.js"

/**
 * Runs the stream to a sink which sums elements, provided they are Numeric.
 */
export function runSum<R, E>(self: C.Stream<R, E, number>): T.Effect<R, E, number> {
  return Run.run_(self, SK.sum())
}
