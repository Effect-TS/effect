// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as RunManaged from "./runManaged.js"
/**
 * Runs a channel until the end is received
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return M.useNow(RunManaged.runManaged(self))
}
