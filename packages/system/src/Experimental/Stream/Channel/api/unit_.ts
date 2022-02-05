// ets_tracing: off

import type * as C from "../core.js"
import * as As from "./as.js"

export function unit_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return As.as_(self, undefined)
}
