// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as C from "../core.js"
import * as Map from "./map.js"

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 */
export function zip_<
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
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  Tp.Tuple<[OutDone, OutDone1]>
> {
  return C.chain_(self, (z) => Map.map_(that, (z2) => Tp.tuple(z, z2)))
}

/**
 * Returns a new channel that is the sequential composition of this channel and the specified
 * channel. The returned channel terminates with a tuple of the terminal values of both channels.
 *
 * @ets_data_first zip_
 */
export function zip<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: C.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => zip_(self, that)
}
