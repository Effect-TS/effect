// ets_tracing: off

import type * as T from "../../../../Effect"
import * as C from "../core"
import * as Flatten from "./flatten"

/**
 * Makes a channel from an effect that returns a channel in case of success
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: T.Effect<R, E, C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): C.Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Flatten.flatten(C.fromEffect(self))
}
