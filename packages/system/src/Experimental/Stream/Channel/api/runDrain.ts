// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as Drain from "./drain.js"
import * as Run from "./run.js"

/**
 * Runs a channel until the end is received
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return Run.run(Drain.drain(self))
}
