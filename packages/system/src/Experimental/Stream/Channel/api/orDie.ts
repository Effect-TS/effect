// ets_tracing: off

import type * as C from "../core.js"
import * as OrDieWith from "./orDieWith.js"

export function orDie_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  err: E
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return OrDieWith.orDieWith_(self, (_) => err)
}

/**
 * @ets_data_first orDie_
 */
export function orDie<E>(err: E) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => orDie_(self, err)
}
