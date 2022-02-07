// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as C from "../core.js"

export function ensuring_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Z
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: T.RIO<Env1, Z>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return C.ensuringWith_(self, (_) => finalizer)
}

/**
 * @ets_data_first ensuring_
 */
export function ensuring<Env1, Z>(finalizer: T.RIO<Env1, Z>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => ensuring_(self, finalizer)
}
