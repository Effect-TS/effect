// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as O from "../../../../Option"
import * as SK from "../../Sink"
import type * as C from "../core"
import * as Run from "./run"

/**
 * Runs the stream to collect the first value emitted by it without running
 * the rest of the stream.
 */
export function runHead<R, E, A>(self: C.Stream<R, E, A>): T.Effect<R, E, O.Option<A>> {
  return Run.run_(self, SK.head())
}
