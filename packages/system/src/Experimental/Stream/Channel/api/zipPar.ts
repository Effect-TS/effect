// ets_tracing: off

import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import * as Ex from "../../../../Exit/index.js"
import * as MH from "../_internal/mergeHelpers.js"
import type * as C from "../core.js"
import * as MergeWith from "./mergeWith.js"

export function zipPar_<
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
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): C.Channel<
  Env1 & Env,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  Tp.Tuple<[OutDone, OutDone1]>
> {
  return MergeWith.mergeWith_(
    self,
    that,
    (exit1) => MH.await_((exit2) => T.done(Ex.zip_(exit1, exit2))),
    (exit2) => MH.await_((exit1) => T.done(Ex.zip_(exit1, exit2)))
  )
}

/**
 * @ets_data_first zipPar_
 */
export function zipPar<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zipPar_(self, that)
}
