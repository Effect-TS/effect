// ets_tracing: off

import type * as C from "../core"
import * as MergeAll from "./mergeAll"

export function mergeAllUnbounded<Env, InErr, InElem, InDone, OutErr, OutElem>(
  channels: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    any
  >
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return MergeAll.mergeAll_(channels, Number.MAX_SAFE_INTEGER)
}
