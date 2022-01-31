// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as DoneCollect from "./doneCollect.js"
import * as Run from "./run.js"

export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, Tp.Tuple<[CK.Chunk<OutElem>, OutDone]>> {
  return Run.run(DoneCollect.doneCollect(self))
}
