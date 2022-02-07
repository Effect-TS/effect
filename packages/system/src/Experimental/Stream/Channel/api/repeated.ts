// ets_tracing: off

import * as C from "../core.js"

/**
 * Repeats this channel forever
 */
export function repeated<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return C.chain_(self, () => repeated(self))
}
