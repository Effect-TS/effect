// ets_tracing: off

import { identity } from "../../../../Function/index.js"
import type * as M from "../../../../Managed/index.js"
import * as C from "../core.js"
import * as ManagedOut from "./managedOut.js"

/**
 * Makes a channel from a managed that returns a channel in case of success
 */
export function unwrapManaged<
  R,
  E,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: M.Managed<R, E, C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): C.Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return C.concatAllWith_(ManagedOut.managedOut(self), identity, identity)
}
