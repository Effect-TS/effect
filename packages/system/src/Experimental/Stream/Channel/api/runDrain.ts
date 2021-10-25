// ets_tracing: off

import type * as T from "../../../../Effect"
import type * as C from "../core"
import * as Drain from "./drain"
import * as Run from "./run"

/**
 * Runs a channel until the end is received
 */
export function runDrain<Env, InErr, InDone, OutElem, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return Run.run(Drain.drain(self))
}
