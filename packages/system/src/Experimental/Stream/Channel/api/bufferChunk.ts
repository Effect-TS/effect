// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as Ref from "../../../../Ref"
import type * as C from "../core"
import * as Buffer from "./buffer"

export function bufferChunk<InElem, InErr, InDone>(
  ref: Ref.Ref<CK.Chunk<InElem>>
): C.Channel<
  unknown,
  InErr,
  CK.Chunk<InElem>,
  InDone,
  InErr,
  CK.Chunk<InElem>,
  InDone
> {
  return Buffer.buffer<CK.Chunk<InElem>, InErr, InDone>(
    CK.empty<InElem>(),
    (_) => CK.isEmpty(_),
    ref
  )
}
