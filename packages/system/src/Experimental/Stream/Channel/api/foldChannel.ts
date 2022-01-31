// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as E from "../../../../Either/index.js"
import * as C from "../core.js"

export function foldChannel_<
  Env,
  Env1,
  Env2,
  InErr,
  InErr1,
  InErr2,
  InElem,
  InElem1,
  InElem2,
  InDone,
  InDone1,
  InDone2,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  onErr: (
    oErr: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => C.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone2>
): C.Channel<
  Env & Env1 & Env2,
  InErr & InErr1 & InErr2,
  InElem & InElem1 & InElem2,
  InDone & InDone1 & InDone2,
  OutErr2 | OutErr1,
  OutElem | OutElem2 | OutElem1,
  OutDone2 | OutDone1
> {
  return C.foldCauseChannel_(
    self,
    (_) => {
      return E.fold_(
        CS.failureOrCause(_),
        (err) => onErr(err),
        (cause) => C.failCause(cause)
      )
    },
    onSucc
  )
}

/**
 * @ets_data_first foldChannel_
 */
export function foldChannel<
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr,
  OutErr1,
  OutElem1,
  OutDone,
  OutDone1
>(
  onErr: (
    oErr: OutErr
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>,
  onSucc: (
    oErr: OutDone
  ) => C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutElem>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => foldChannel_(self, onErr, onSucc)
}
