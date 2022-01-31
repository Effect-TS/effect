// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as CollectAllWhileWith from "./collectAllWhileWith.js"
import type * as C from "./core.js"

export function repeat<R, InErr, In, OutErr, L extends In, Z>(
  self: C.Sink<R, InErr, In, OutErr, L, Z>
): C.Sink<R, InErr, In, OutErr, L, CK.Chunk<Z>> {
  return CollectAllWhileWith.collectAllWhileWith_(
    self,
    CK.empty<Z>(),
    (_) => true,
    (s, z) => CK.append_(s, z)
  )
}
