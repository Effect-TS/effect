// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as O from "../../../../Option/index.js"
import * as SK from "../../Sink/index.js"
import type * as C from "../core.js"
import * as Run from "./run.js"

/**
 * Runs the stream to completion and yields the last value emitted by it,
 * discarding the rest of the elements.
 */
export function runLast<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, O.Option<A>> {
  return Run.run_(self, SK.last())
}
