// ets_tracing: off

import type * as C from "../core.js"
import * as MapOut from "./mapOut.js"
import * as MergeAll from "./mergeAll.js"
import type { MergeStrategy } from "./mergeAllWith.js"

export function mergeMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  Z
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  n: number,
  f: (
    outElem: OutElem
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeStrategy = "BackPressure"
): C.Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem1,
  Z
> {
  return MergeAll.mergeAll_<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem1
  >(MapOut.mapOut_(self, f), n, bufferSize, mergeStrategy)
}

/**
 * @ets_data_first mergeMap_
 */
export function mergeMap<OutElem, Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>(
  n: number,
  f: (
    outElem: OutElem
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, Z>,
  bufferSize = 16,
  mergeStrategy: MergeAll.MergeStrategy = "BackPressure"
) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mergeMap_(self, n, f, bufferSize, mergeStrategy)
}
