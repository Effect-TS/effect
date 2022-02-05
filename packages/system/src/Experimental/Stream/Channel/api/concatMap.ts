// ets_tracing: off

import * as C from "../core.js"

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 */
export function concatMap_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone,
  OutDone2,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>,
  f: (
    o: OutElem
  ) => C.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): C.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> {
  return C.concatMapWith_(
    self,
    f,
    () => void 0,
    () => void 0
  )
}

/**
 * Returns a new channel whose outputs are fed to the specified factory function, which creates
 * new channels in response. These new channels are sequentially concatenated together, and all
 * their outputs appear as outputs of the newly returned channel.
 *
 * @ets_data_first concatMap_
 */
export function concatMap<
  OutElem,
  OutElem2,
  OutDone,
  Env2,
  InErr2,
  InElem2,
  InDone2,
  OutErr2
>(
  f: (
    o: OutElem
  ) => C.Channel<Env2, InErr2, InElem2, InDone2, OutErr2, OutElem2, OutDone>
): <Env, InErr, InElem, InDone, OutErr, OutDone2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2>
) => C.Channel<
  Env & Env2,
  InErr & InErr2,
  InElem & InElem2,
  InDone & InDone2,
  OutErr | OutErr2,
  OutElem2,
  unknown
> {
  return (self) => concatMap_(self, f)
}
