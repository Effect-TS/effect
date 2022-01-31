// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as FromChunk from "./fromChunk.js"

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): C.UIO<O> {
  return FromChunk.fromChunk(CK.single(o))
}
