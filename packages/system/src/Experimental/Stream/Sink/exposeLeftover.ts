// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import * as Tp from "../../../Collections/Immutable/Tuple"
import * as CH from "../Channel"
import * as C from "./core.js"

export function exposeLeftover<R, InErr, In, OutErr, L, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
): C.Sink<R, InErr, In, OutErr, unknown, Tp.Tuple<[Z, CK.Chunk<L>]>> {
  return new C.Sink(
    CH.map_(CH.doneCollect(self.channel), ({ tuple: [chunks, z] }) =>
      Tp.tuple(z, CK.flatten(chunks))
    )
  )
}
