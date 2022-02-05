// ets_tracing: off

import type * as C from "../core.js"
import * as ConcatAll from "./concatAll.js"
import * as MapOut from "./mapOut.js"

/**
 * Returns a new channel, which is the concatenation of all the channels that are written out by
 * this channel. This method may only be called on channels that output other channels.
 */
export function concatOut<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any>,
    OutDone
  >
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, any> {
  return ConcatAll.concatAll(MapOut.mapOut_(self, (out) => out))
}
