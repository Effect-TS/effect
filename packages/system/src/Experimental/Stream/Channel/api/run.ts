// ets_tracing: off

import type * as T from "../../../../Effect"
import * as M from "../../../../Managed"
import type * as C from "../core"
import * as RunManaged from "./runManaged"
/**
 * Runs a channel until the end is received
 */
export function run<Env, InErr, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, never, OutDone>
): T.Effect<Env, OutErr, OutDone> {
  return M.useNow(RunManaged.runManaged(self))
}
