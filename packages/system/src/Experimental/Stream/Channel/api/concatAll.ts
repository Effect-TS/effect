// ets_tracing: off

import * as C from "../core.js"

export function concatAll<Env, InErr, InElem, InDone, OutErr, OutElem>(
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
  return C.concatAllWith_(
    channels,
    (_, __) => void 0,
    (_, __) => void 0
  )
}
