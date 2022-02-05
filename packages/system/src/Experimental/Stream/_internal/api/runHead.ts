// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as O from "../../../../Option/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as Run from "./run.js"

/**
 * Runs the stream to collect the first value emitted by it without running
 * the rest of the stream.
 */
export function runHead<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, O.Option<A>> {
  return Run.run_(self, SK.head())
}
