// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk/index.js"
import * as HS from "../../../Collections/Immutable/HashSet/index.js"
import type * as C from "./core.js"
import * as FoldLeftChunks from "./foldLeftChunks.js"

/**
 * A sink that collects all of its inputs into a set.
 */
export function collectAllToSet<Err, In>(): C.Sink<
  unknown,
  Err,
  In,
  Err,
  unknown,
  HS.HashSet<In>
> {
  return FoldLeftChunks.foldLeftChunks<Err, In, HS.HashSet<In>>(HS.make(), (acc, as) =>
    CK.reduce_(as, acc, (s, a) => HS.add_(s, a))
  )
}
