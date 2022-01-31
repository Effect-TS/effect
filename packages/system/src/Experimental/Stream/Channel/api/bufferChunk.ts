// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as Ref from "../../../../Ref/index.js"
import type * as C from "../core.js"
import * as Buffer from "./buffer.js"

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
