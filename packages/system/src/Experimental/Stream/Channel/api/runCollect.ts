// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as Tp from "../../../../Collections/Immutable/Tuple"
import type * as T from "../../../../Effect"
import type * as C from "../core"
import * as DoneCollect from "./doneCollect"
import * as Run from "./run"

export function runCollect<Env, InErr, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, unknown, InDone, OutErr, OutElem, OutDone>
): T.Effect<Env, OutErr, Tp.Tuple<[CK.Chunk<OutElem>, OutDone]>> {
  return Run.run(DoneCollect.doneCollect(self))
}
