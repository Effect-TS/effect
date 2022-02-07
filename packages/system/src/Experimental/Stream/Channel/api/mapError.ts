// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import type * as C from "../core.js"
import * as MapErrorCause from "./mapErrorCause.js"

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 */
export function mapError_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (err: OutErr) => OutErr2
): C.Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return MapErrorCause.mapErrorCause_(self, (cause) => CS.map_(cause, f))
}

/**
 * Returns a new channel, which is the same as this one, except the failure value of the returned
 * channel is created by applying the specified function to the failure value of this channel.
 *
 * @ets_data_first mapError_
 */
export function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => mapError_(self, f)
}
