// ets_tracing: off

import * as C from "../core.js"
import * as CatchAll from "./catchAll.js"

export function orDieWith_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (e: OutErr) => E
) {
  return CatchAll.catchAll_(self, (e) => C.die(f(e)))
}

/**
 * @ets_data_first orDieWith_
 */
export function orDieWith<OutErr, E>(f: (e: OutErr) => E) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDieWith_(self, f)
}
