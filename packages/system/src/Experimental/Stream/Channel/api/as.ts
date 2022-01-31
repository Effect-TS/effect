// ets_tracing: off

import type * as C from "../core.js"
import * as Map from "./map.js"

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 */
export function as_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  z2: OutDone2
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return Map.map_(self, (_) => z2)
}

/**
 * Returns a new channel that is the same as this one, except the terminal value of the channel
 * is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<OutDone2>(z2: OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => as_(self, z2)
}
