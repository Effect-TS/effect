// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as C from "../core"
import * as FromChunk from "./fromChunk"

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): C.UIO<O> {
  return FromChunk.fromChunk(CK.single(o))
}
