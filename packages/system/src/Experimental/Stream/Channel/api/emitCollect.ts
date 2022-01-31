// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as C from "../core.js"
import * as DoneCollect from "./doneCollect.js"

/**
 * Returns a new channel that collects the output and terminal value of this channel, which it
 * then writes as output of the returned channel.
 */
export function emitCollect<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  Tp.Tuple<[CK.Chunk<OutElem>, OutDone]>,
  void
> {
  return C.chain_(DoneCollect.doneCollect(self), (t) => C.write(t))
}
