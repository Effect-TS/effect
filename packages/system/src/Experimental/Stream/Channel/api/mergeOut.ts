// ets_tracing: off

import type * as C from "../core.js"
import * as MapOut from "./mapOut.js"
import * as MergeAll from "./mergeAll.js"

export function mergeOut_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone
>(
  self: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
    OutDone
  >,
  n: number
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  any
> {
  return MergeAll.mergeAll_<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1
  >(
    MapOut.mapOut_(self, (x) => x),
    n
  )
}

/**
 * @ets_data_first mergeOut_
 */
export function mergeOut(n: number) {
  return <
    Env,
    Env1,
    InErr,
    InErr1,
    InElem,
    InElem1,
    InDone,
    InDone1,
    OutErr,
    OutErr1,
    OutElem1,
    OutDone
  >(
    self: C.Channel<
      Env,
      InErr,
      InElem,
      InDone,
      OutErr,
      C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, any>,
      OutDone
    >
  ) => mergeOut_(self, n)
}
